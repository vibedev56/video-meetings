import { Check } from 'lucide-react';
import { classNames } from '@/lib/class-names';
import { PipelineStepState, type PipelineStep } from '@/lib/meeting-pipeline';

const BULLET_BASE =
  'flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold';

function StepBullet({ step, index }: { step: PipelineStep; index: number }) {
  if (step.state === PipelineStepState.DONE) {
    return (
      <span
        aria-hidden
        className={classNames(BULLET_BASE, 'bg-ds-accent text-ds-on-accent')}
      >
        <Check className="size-4" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={classNames(
        BULLET_BASE,
        step.state === PipelineStepState.CURRENT &&
          'bg-ds-accent text-ds-on-accent',
        step.state === PipelineStepState.PENDING &&
          'border border-ds-line-strong bg-ds-surface text-ds-muted',
        step.state === PipelineStepState.ERROR &&
          'border border-ds-danger bg-ds-danger-soft text-ds-danger',
      )}
    >
      {step.state === PipelineStepState.ERROR ? '!' : index + 1}
    </span>
  );
}

/**
 * Upload -> transcription -> AI. A row with connecting lines from 768px, a
 * column below that.
 */
export function MeetingPipeline({ steps }: { steps: PipelineStep[] }) {
  return (
    <ol
      aria-label="Этапы обработки встречи"
      className="flex flex-col gap-3.5 border-t border-ds-line bg-ds-bg px-5 py-4 md:flex-row md:items-center md:gap-4 md:px-7"
    >
      {steps.map((step, index) => (
        <li
          key={step.id}
          className={classNames(
            'flex items-center gap-4',
            index < steps.length - 1 && 'md:flex-1',
          )}
        >
          <div className="flex shrink-0 items-center gap-2.5">
            <StepBullet step={step} index={index} />
            <div className="flex flex-col gap-px">
              <span className="text-sm font-bold text-ds-ink">
                {step.title}
              </span>
              <span
                className={classNames(
                  'text-xs',
                  step.state === PipelineStepState.ERROR
                    ? 'text-ds-danger'
                    : 'text-ds-muted',
                )}
              >
                {step.subtitle}
              </span>
            </div>
          </div>
          {index < steps.length - 1 && (
            <span
              aria-hidden
              className={classNames(
                'hidden h-0.5 flex-1 rounded-[1px] md:block',
                step.state === PipelineStepState.DONE
                  ? 'bg-ds-accent'
                  : 'bg-ds-line',
              )}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
