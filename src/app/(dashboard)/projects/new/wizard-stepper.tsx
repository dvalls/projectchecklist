"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface WizardStep {
  id: string;
  label: string;
  shortLabel?: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentIndex: number;
  furthestIndex: number;
  onStepClick?: (index: number) => void;
}

export function WizardStepper({
  steps,
  currentIndex,
  furthestIndex,
  onStepClick,
}: WizardStepperProps) {
  return (
    <div className="w-full">
      <ol className="flex items-center gap-2 overflow-x-auto pb-1">
        {steps.map((step, i) => {
          const isCurrent = i === currentIndex;
          const isCompleted = i < furthestIndex;
          const isReachable = i <= furthestIndex;
          const showLabel = isCurrent;
          return (
            <li key={step.id} className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={!isReachable || !onStepClick}
                onClick={() => onStepClick?.(i)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  "disabled:cursor-not-allowed",
                  isCurrent && "border-primary bg-primary text-primary-foreground",
                  !isCurrent &&
                    isCompleted &&
                    "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15",
                  !isCurrent &&
                    !isCompleted &&
                    "border-border bg-background text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                    isCurrent
                      ? "bg-primary-foreground/20"
                      : isCompleted
                        ? "bg-primary/20"
                        : "bg-muted",
                  )}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                </span>
                <span
                  className={cn("whitespace-nowrap", !showLabel && "hidden sm:inline")}
                >
                  {step.shortLabel ?? step.label}
                </span>
              </button>
              {i < steps.length - 1 ? (
                <span
                  className={cn(
                    "hidden h-px w-4 sm:block",
                    isCompleted ? "bg-primary/40" : "bg-border",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
