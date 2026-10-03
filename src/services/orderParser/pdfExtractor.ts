import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker } from 'tesseract.js';
import type { ParsedOrderResult } from './types';
import { parseOrderText } from './textParser';

// Initialize PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface PdfExtractionProgress {
  status: string;
  percent: number;
}

export interface ExtractPdfOptions {
  forceOcr?: boolean;
  onProgress?: (progress: PdfExtractionProgress) => void;
}

interface TextItemPositioned {
  str: string;
  x: number;
  y: number;
  height: number;
}

/**
 * Reconstructs lines from PDF text items using spatial coordinates (Y bands & X position)
 */
function reconstructLinesFromPdfItems(items: TextItemPositioned[]): string[] {
  if (items.length === 0) return [];

  // Group items by vertical position (Y coordinate in PDF is usually from bottom up)
  // We use a small threshold (e.g. 4-6 units) to group words on the same line
  const lineThreshold = 5;
  const lines: Array<{ y: number; items: TextItemPositioned[] }> = [];

  for (const item of items) {
    if (!item.str.trim()) continue;

    let foundLine = lines.find((l) => Math.abs(l.y - item.y) <= lineThreshold);
    if (!foundLine) {
      foundLine = { y: item.y, items: [] };
      lines.push(foundLine);
    }
    foundLine.items.push(item);
  }

  // Sort lines top to bottom (higher Y in PDF means higher on the page)
  lines.sort((a, b) => b.y - a.y);

  return lines.map((line) => {
    // Sort items left to right
    line.items.sort((a, b) => a.x - b.x);
    return line.items.map((i) => i.str).join(' ').trim();
  }).filter(Boolean);
}

/**
 * Extracts digital text from a PDF document
 */
async function extractDigitalText(
  pdf: any,
  onProgress?: (progress: PdfExtractionProgress) => void
): Promise<{ text: string; pageCount: number; isSparse: boolean }> {
  const pageCount = pdf.numPages;
  const pageTexts: string[] = [];
  let totalChars = 0;

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    onProgress?.({
      status: `Extracting digital text from page ${pageNum} of ${pageCount}...`,
      percent: Math.round((pageNum / pageCount) * 50),
    });

    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const positionedItems: TextItemPositioned[] = [];
    for (const item of content.items) {
      if ('str' in item && typeof item.str === 'string') {
        const x = item.transform ? item.transform[4] : 0;
        const y = item.transform ? item.transform[5] : 0;
        positionedItems.push({
          str: item.str,
          x,
          y,
          height: item.height || 10,
        });
      }
    }

    const lines = reconstructLinesFromPdfItems(positionedItems);
    const pageText = lines.join('\n');
    totalChars += pageText.replace(/\s+/g, '').length;
    pageTexts.push(pageText);
  }

  // If average characters per page is very low (< 25 characters), it's likely a scanned image PDF
  const isSparse = totalChars < 25;

  return {
    text: pageTexts.join('\n\n'),
    pageCount,
    isSparse,
  };
}

/**
 * Runs OCR on a scanned PDF by rendering pages to canvas and using Tesseract.js
 */
async function extractOcrText(
  pdf: any,
  onProgress?: (progress: PdfExtractionProgress) => void
): Promise<string> {
  const pageCount = pdf.numPages;
  const ocrPages: string[] = [];

  onProgress?.({
    status: 'Initializing OCR engine for scanned document...',
    percent: 52,
  });

  const worker = await createWorker('eng');

  try {
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      onProgress?.({
        status: `Rendering page ${pageNum} for OCR recognition...`,
        percent: 55 + Math.round(((pageNum - 1) / pageCount) * 40),
      });

      const page = await pdf.getPage(pageNum);
      // High resolution scale for high OCR accuracy
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const canvasContext = canvas.getContext('2d');

      if (!canvasContext) {
        throw new Error('Canvas 2D context not available for OCR rendering.');
      }

      await page.render({
        canvasContext,
        viewport,
      }).promise;

      onProgress?.({
        status: `Scanning text on page ${pageNum} of ${pageCount}...`,
        percent: 60 + Math.round((pageNum / pageCount) * 35),
      });

      const recognitionResult = await worker.recognize(canvas);
      ocrPages.push(recognitionResult.data.text);
    }
  } finally {
    await worker.terminate();
  }

  return ocrPages.join('\n\n');
}

/**
 * Main PDF Extraction Pipeline
 * Reads a PDF file, extracts digital text, falls back to OCR if scanned,
 * and feeds the resulting text into the unified order parser.
 */
export async function extractAndParsePdf(
  fileOrBuffer: File | ArrayBuffer,
  fileName = 'order.pdf',
  options: ExtractPdfOptions = {}
): Promise<ParsedOrderResult> {
  const { forceOcr = false, onProgress } = options;

  let arrayBuffer: ArrayBuffer;
  if (fileOrBuffer instanceof File) {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    arrayBuffer = fileOrBuffer;
  }

  onProgress?.({ status: 'Loading PDF document...', percent: 5 });

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  let rawText = '';
  let ocrUsed = false;

  if (forceOcr) {
    onProgress?.({ status: 'Running OCR as requested...', percent: 50 });
    rawText = await extractOcrText(pdf, onProgress);
    ocrUsed = true;
  } else {
    // 1. First attempt: Fast digital text extraction
    const digital = await extractDigitalText(pdf, onProgress);
    rawText = digital.text;

    // 2. Fallback: If text is missing or sparse (scanned document), run OCR
    if (digital.isSparse) {
      onProgress?.({
        status: 'Scanned or image-based PDF detected. Running OCR fallback...',
        percent: 50,
      });
      rawText = await extractOcrText(pdf, onProgress);
      ocrUsed = true;
    }
  }

  onProgress?.({ status: 'Parsing extracted text into structured order...', percent: 98 });

  // Feed clean extracted text into the unified order parser
  const parsedOrder = parseOrderText(rawText, 'PDF', ocrUsed, fileName, pageCount);

  onProgress?.({ status: 'Parsing completed successfully', percent: 100 });

  return parsedOrder;
}
