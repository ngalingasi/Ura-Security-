interface Step {
  label:    string;
  subtitle?: string;
}

interface WizardStepperProps {
  steps:       Step[];
  currentStep: number;   // 0-indexed
}

export default function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  return (
    <div className="flex items-center justify-between mb-8 px-1 overflow-x-auto">
      {steps.map((step, idx) => {
        const done    = idx < currentStep;
        const active  = idx === currentStep;
        const pending = idx > currentStep;

        return (
          <div key={idx} className="flex items-center flex-1 last:flex-none min-w-0">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors
                  ${done    ? 'bg-brand-500 border-brand-500 text-white'                            : ''}
                  ${active  ? 'bg-white dark:bg-gray-900 border-brand-500 text-brand-600 dark:text-brand-400 shadow-focus-ring' : ''}
                  ${pending ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400' : ''}
                `}
              >
                {done
                  ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  : idx + 1
                }
              </div>
              <div className="text-center hidden sm:block">
                <p className={`text-xs font-medium whitespace-nowrap ${active ? 'text-brand-600 dark:text-brand-400' : done ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                {step.subtitle && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{step.subtitle}</p>
                )}
              </div>
            </div>
            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${idx < currentStep ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
