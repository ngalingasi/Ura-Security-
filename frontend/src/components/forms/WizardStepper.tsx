import { memo } from 'react';

interface Step { label: string; subtitle?: string; }

// memo prevents re-render when parent form state changes
const WizardStepper = memo(function WizardStepper({
  steps, currentStep,
}: {
  steps: Step[]; currentStep: number;
}) {
  return (
    <div className="flex items-center mb-8 px-1 overflow-x-auto pb-1">
      {steps.map((step, idx) => {
        const done    = idx < currentStep;
        const active  = idx === currentStep;

        return (
          <div key={idx} className="flex items-center flex-1 last:flex-none min-w-0">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2
                ${done    ? 'bg-brand-500 border-brand-500 text-white'                                              : ''}
                ${active  ? 'bg-white dark:bg-gray-900 border-brand-500 text-brand-600 dark:text-brand-400'         : ''}
                ${!done && !active ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400' : ''}
              `}>
                {done
                  ? <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  : idx + 1
                }
              </div>
              <div className="text-center hidden sm:block min-w-0">
                <p className={`text-xs font-medium whitespace-nowrap truncate max-w-[80px]
                  ${active ? 'text-brand-600 dark:text-brand-400' : done ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}`}>
                  {step.label}
                </p>
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded-full ${idx < currentStep ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
});

export default WizardStepper;
