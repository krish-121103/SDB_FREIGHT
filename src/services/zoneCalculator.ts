import type { DeliveryZone, PostcodeEntry } from '../types';
import postcodesData from '../data/postcodes.json';

const postcodesMap = new Map<string, PostcodeEntry>();

(postcodesData as PostcodeEntry[]).forEach((entry) => {
  postcodesMap.set(entry.postcode.trim(), entry);
});

export interface ZoneDetectionResult {
  postcode: string;
  detectedZone: DeliveryZone;
  zoneLabel: string;
  suburb?: string;
  state?: string;
  isRecognized: boolean;
  sourceDescription: string;
}

export function getZoneLabel(zone: DeliveryZone): string {
  switch (zone) {
    case 'METRO':
      return 'Metro';
    case 'MAJOR_REGIONAL':
      return 'Major Regional Centre';
    case 'OTHER_REGIONAL':
      return 'Other Regional Area';
    case 'REMOTE':
      return 'Remote Location';
    default:
      return zone;
  }
}

export function determineDeliveryZone(
  inputPostcode: string,
  manualZoneOverride?: DeliveryZone | null
): ZoneDetectionResult {
  const cleanPostcode = inputPostcode.trim();

  // If manual override is selected, it takes priority
  if (manualZoneOverride) {
    const matched = postcodesMap.get(cleanPostcode);
    return {
      postcode: cleanPostcode,
      detectedZone: manualZoneOverride,
      zoneLabel: getZoneLabel(manualZoneOverride),
      suburb: matched?.suburb,
      state: matched?.state,
      isRecognized: true,
      sourceDescription: 'Manual Zone Override (User Selected)',
    };
  }

  // Exact match from demo database
  const entry = postcodesMap.get(cleanPostcode);
  if (entry) {
    return {
      postcode: cleanPostcode,
      detectedZone: entry.zone,
      zoneLabel: getZoneLabel(entry.zone),
      suburb: entry.suburb,
      state: entry.state,
      isRecognized: true,
      sourceDescription: 'Demo postcode configuration (Pending SDB approval)',
    };
  }

  // Heuristic fallback for Australian 4-digit postcodes if not explicitly in sample list
  if (/^\d{4}$/.test(cleanPostcode)) {
    const pcNum = parseInt(cleanPostcode, 10);
    let fallbackZone: DeliveryZone = 'OTHER_REGIONAL';
    let state = 'AU';

    // Capital city metro approximate ranges
    if (
      (pcNum >= 2000 && pcNum <= 2234) || // Sydney Metro
      (pcNum >= 3000 && pcNum <= 3207) || // Melbourne Metro
      (pcNum >= 4000 && pcNum <= 4179) || // Brisbane Metro
      (pcNum >= 5000 && pcNum <= 5199) || // Adelaide Metro
      (pcNum >= 6000 && pcNum <= 6199) || // Perth Metro
      (pcNum >= 2600 && pcNum <= 2612)    // Canberra Metro
    ) {
      fallbackZone = 'METRO';
    } else if (
      pcNum < 1000 ||                     // NT / Remote
      (pcNum >= 6700 && pcNum <= 6799) || // WA Outback
      (pcNum >= 4870 && pcNum <= 4899)    // Far North QLD Remote
    ) {
      fallbackZone = 'REMOTE';
    }

    if (pcNum >= 2000 && pcNum <= 2599) state = 'NSW';
    else if (pcNum >= 2600 && pcNum <= 2618) state = 'ACT';
    else if (pcNum >= 3000 && pcNum <= 3999) state = 'VIC';
    else if (pcNum >= 4000 && pcNum <= 4999) state = 'QLD';
    else if (pcNum >= 5000 && pcNum <= 5999) state = 'SA';
    else if (pcNum >= 6000 && pcNum <= 6999) state = 'WA';
    else if (pcNum >= 7000 && pcNum <= 7999) state = 'TAS';
    else if (pcNum < 1000) state = 'NT';

    return {
      postcode: cleanPostcode,
      detectedZone: fallbackZone,
      zoneLabel: getZoneLabel(fallbackZone),
      state,
      isRecognized: true,
      sourceDescription: 'Demo postcode heuristic mapping (Pending SDB approval)',
    };
  }

  // If blank or invalid, default to Metro for preview
  return {
    postcode: cleanPostcode,
    detectedZone: 'METRO',
    zoneLabel: getZoneLabel('METRO'),
    isRecognized: false,
    sourceDescription: 'Default fallback (Metro) - Postcode not recognised',
  };
}
