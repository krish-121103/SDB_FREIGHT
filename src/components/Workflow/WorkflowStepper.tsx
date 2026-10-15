import React from 'react';
import {
  MapPin,
  Layers,
  Boxes,
  Calculator,
  History,
  Check,
  Sparkles,
  LayoutGrid,
  GitFork,
} from 'lucide-react';

interface WorkflowStepperProps {
  currentStep: number;
  activeTab: 'workflow' | 'session_log';
  onSelectStep: (step: number) => void;
  onSelectTab: (tab: 'workflow' | 'session_log') => void;
  sessionQuotesCount: number;
  viewMode: 'stepper' | 'dashboard';
  onToggleViewMode: () => void;
  isStep2Unlocked: boolean;
  isStep3Unlocked: boolean;
  isStep4Unlocked: boolean;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStep,
  activeTab,
  onSelectStep,
  onSelectTab,
  sessionQuotesCount,
  viewMode,
  onToggleViewMode,
  isStep2Unlocked,
  isStep3Unlocked,
  isStep4Unlocked,
}) => {
  const steps = [
    {
      step: 1,
      title: 'Delivery & Zone',
      subtitle: 'Postcode, destination & order value',
      icon: MapPin,
      isUnlocked: true,
    },
    {
      step: 2,
      title: 'Order Items',
      subtitle: 'SKU selection & cargo specs',
      icon: Layers,
      isUnlocked: isStep2Unlocked,
    },
    {
      step: 3,
      title: 'Packaging & Pallets',
      subtitle: 'Cartons, bulky & pallet rules',
      icon: Boxes,
      isUnlocked: isStep3Unlocked,
    },
    {
      step: 4,
      title: 'Freight Quote',
      subtitle: 'Final pricing, GST & policy audit',
      icon: Calculator,
      isUnlocked: isStep4Unlocked,
    },
  ];

  return (
    <div className="stepper-wrapper">
      {/* Top Bar with Mode Switcher & Session Memory Badge */}
      <div className="stepper-top-bar">
        <div className="stepper-mode-group">
          <button
            className={`stepper-mode-btn ${activeTab === 'workflow' && viewMode === 'stepper' ? 'active' : ''}`}
            onClick={() => {
              onSelectTab('workflow');
              if (viewMode !== 'stepper') onToggleViewMode();
            }}
          >
            <GitFork size={15} />
            <span>Guided Step-by-Step Workflow</span>
          </button>

          <button
            className={`stepper-mode-btn ${activeTab === 'workflow' && viewMode === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              onSelectTab('workflow');
              if (viewMode !== 'dashboard') onToggleViewMode();
            }}
            title="Switch to all-in-one operations dashboard"
          >
            <LayoutGrid size={15} />
            <span>All-in-One Dashboard</span>
          </button>

          <button
            className={`stepper-mode-btn ${activeTab === 'session_log' ? 'active' : ''}`}
            onClick={() => onSelectTab('session_log')}
          >
            <History size={15} />
            <span>Temporary Session Orders</span>
            {sessionQuotesCount > 0 ? (
              <span className="session-count-badge pulse">{sessionQuotesCount}</span>
            ) : (
              <span className="session-count-badge muted">0</span>
            )}
          </button>
        </div>

        <div className="js-storage-notice-badge" title="Temporary in-memory JavaScript storage. Naturally resets when the browser page is refreshed.">
          <Sparkles size={13} className="sparkle-icon" />
          <span>JS Storage: <strong>Volatile (Cleared on Refresh)</strong></span>
        </div>
      </div>

      {/* Stepper Wizard Bar (only visible when in workflow mode) */}
      {activeTab === 'workflow' && viewMode === 'stepper' && (
        <div className="workflow-steps-container">
          <div className="workflow-steps-track">
            {steps.map((st) => {
              const isCurrent = currentStep === st.step;
              const isPassed = currentStep > st.step;
              const isClickable = st.isUnlocked || isPassed;
              const Icon = st.icon;

              return (
                <button
                  key={st.step}
                  type="button"
                  className={`step-card ${isCurrent ? 'current' : ''} ${isPassed ? 'passed' : ''} ${!isClickable ? 'disabled' : ''}`}
                  onClick={() => {
                    if (isClickable) {
                      onSelectStep(st.step);
                    }
                  }}
                  disabled={!isClickable}
                >
                  <div className="step-card-header">
                    <div className="step-icon-wrap">
                      {isPassed ? (
                        <Check size={16} strokeWidth={3} className="check-icon" />
                      ) : (
                        <Icon size={16} />
                      )}
                    </div>
                    <span className="step-number-tag">
                      Step {st.step} of 4
                    </span>
                  </div>

                  <div className="step-card-body">
                    <div className="step-title">{st.title}</div>
                    <div className="step-desc">{st.subtitle}</div>
                  </div>

                  {isCurrent && <div className="step-indicator-bar" />}
                </button>
              );
            })}
          </div>

          {/* Progress Percentage Indicator */}
          <div className="workflow-progress-line">
            <div
              className="workflow-progress-fill"
              style={{
                width: `${((currentStep - 1) / 3) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
