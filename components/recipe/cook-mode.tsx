"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Check,
  ChefHat,
  ListChecks,
  Pause,
  Play,
  RotateCcw,
  Timer,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useAlarmSound } from "@/hooks/use-alarm-sound";
import {
  type CookIngredient,
  type StepDuration,
  type TimerState,
  cookStepStorageKey,
  createTimer,
  describeDuration,
  formatClock,
  ingredientQuantity,
  parseStepDurations,
  parseStoredStep,
  pauseTimer,
  resetTimer,
  splitByDurations,
  startTimer,
  timerRemaining,
  tickTimer,
} from "@/lib/cook-mode";
import { cn } from "@/lib/utils";

interface CookModeProps {
  recipeId: string;
  title: string;
  /** Already scaled and unit-converted (recipe-detail's convertedIngredients) */
  ingredients: CookIngredient[];
  /** Steps with temperatures already converted (convertedInstructions) */
  instructions: Array<{ id?: string; convertedText: string }>;
}

interface CookStep {
  text: string;
  durations: StepDuration[];
}

const timerKey = (step: number, duration: number) => `${step}:${duration}`;

// Only ever read from event handlers and the ticking interval.
const clock = () => Date.now();

function readStoredStep(recipeId: string, stepCount: number): number {
  try {
    return parseStoredStep(
      sessionStorage.getItem(cookStepStorageKey(recipeId)),
      stepCount
    );
  } catch {
    return 0;
  }
}

function storeStep(recipeId: string, step: number | null) {
  try {
    const key = cookStepStorageKey(recipeId);
    if (step === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, String(step));
  } catch {
    // Storage blocked: the step just isn't remembered.
  }
}

/**
 * Full-screen, one-step-at-a-time view for cooking from a recipe: large type,
 * a tickable ingredient list, timers for the durations in each step, and the
 * screen kept awake while it is open.
 */
export function CookMode({ recipeId, title, ingredients, instructions }: CookModeProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [timers, setTimers] = useState<Record<string, TimerState>>({});
  const [now, setNow] = useState(clock);
  const [alerts, setAlerts] = useState<string[]>([]);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const ingredientsId = useId();
  const { prime, play } = useAlarmSound();

  useWakeLock(open);

  const steps: CookStep[] = useMemo(
    () =>
      instructions.map((instruction) => ({
        text: instruction.convertedText,
        durations: parseStepDurations(instruction.convertedText),
      })),
    [instructions]
  );
  const stepCount = steps.length;
  const currentStep = steps[Math.min(step, stepCount - 1)];
  const isLast = step >= stepCount - 1;

  // ─── Timers ──────────────────────────────────────────────────────────────

  const timersRef = useRef(timers);
  const openRef = useRef(open);
  useEffect(() => {
    timersRef.current = timers;
    openRef.current = open;
  });

  const durationFor = useCallback(
    (key: string) => {
      const [s, d] = key.split(":").map(Number);
      return steps[s]?.durations[d];
    },
    [steps]
  );

  const announceFinished = useCallback(
    (keys: string[]) => {
      try {
        navigator.vibrate?.([300, 150, 300, 150, 300]);
      } catch {
        // Vibration unsupported
      }
      play();
      if (openRef.current) {
        setAlerts((prev) => [...prev, ...keys.filter((key) => !prev.includes(key))]);
      } else {
        // Cook mode was closed with a timer still running.
        for (const key of keys) {
          const duration = durationFor(key);
          const stepNumber = Number(key.split(":")[0]) + 1;
          toast(`Timer done: ${duration?.text ?? "timer"} (step ${stepNumber})`);
        }
      }
    },
    [play, durationFor]
  );

  const anyRunning = Object.values(timers).some((timer) => timer.status === "running");

  useEffect(() => {
    if (!anyRunning) return;
    const interval = window.setInterval(() => {
      const at = clock();
      setNow(at);
      const current = timersRef.current;
      const finished = Object.keys(current).filter(
        (key) => tickTimer(current[key], at).status !== current[key].status
      );
      if (finished.length === 0) return;
      setTimers((prev) => {
        const next = { ...prev };
        for (const key of finished) {
          if (next[key]) next[key] = tickTimer(next[key], at);
        }
        return next;
      });
      announceFinished(finished);
    }, 250);
    return () => window.clearInterval(interval);
  }, [anyRunning, announceFinished]);

  const timerFor = (key: string, seconds: number) => timers[key] ?? createTimer(seconds);

  const handleStart = (key: string, seconds: number) => {
    // Starting is a click, which lets the alarm make sound later.
    prime();
    const at = clock();
    setNow(at);
    setTimers((prev) => ({ ...prev, [key]: startTimer(prev[key] ?? createTimer(seconds), at) }));
    setAlerts((prev) => prev.filter((k) => k !== key));
  };

  const handlePause = (key: string) => {
    const at = clock();
    setNow(at);
    setTimers((prev) => (prev[key] ? { ...prev, [key]: pauseTimer(prev[key], at) } : prev));
  };

  const handleReset = (key: string) => {
    setTimers((prev) => (prev[key] ? { ...prev, [key]: resetTimer(prev[key]) } : prev));
    setAlerts((prev) => prev.filter((k) => k !== key));
  };

  // ─── Steps ───────────────────────────────────────────────────────────────

  const goTo = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(target, stepCount - 1));
      setStep(clamped);
      storeStep(recipeId, clamped);
    },
    [recipeId, stepCount]
  );

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setStep(readStoredStep(recipeId, stepCount));
      setShowIngredients(false);
    } else {
      setAlerts([]);
    }
    setOpen(next);
  };

  const handleFinish = () => {
    storeStep(recipeId, null);
    setStep(0);
    handleOpenChange(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(step + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(step - 1);
    }
  };

  if (stepCount === 0) return null;

  // Timers that belong to other steps but still matter (running, paused or
  // just finished), so a bake timer stays in view while moving on.
  const otherTimers = Object.entries(timers)
    .filter(([key, timer]) => timer.status !== "idle" && Number(key.split(":")[0]) !== step)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));

  const hasIngredients = ingredients.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ChefHat className="h-4 w-4" aria-hidden="true" />
          Cook
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        onKeyDown={handleKeyDown}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          nextButtonRef.current?.focus();
        }}
        className="inset-0 top-0 left-0 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 shadow-none sm:max-w-none"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate font-display text-lg font-semibold text-foreground sm:text-xl">
              {title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Cook mode shows one step at a time. Use the left and right arrow
              keys to move between steps, and Escape to exit.
            </DialogDescription>
            <p className="text-sm text-muted-foreground" aria-hidden="true">
              Step {step + 1} of {stepCount}
            </p>
          </div>
          {hasIngredients && (
            <Button
              variant="outline"
              className="has-[>svg]:px-3 sm:has-[>svg]:px-5 lg:hidden"
              aria-expanded={showIngredients}
              aria-controls={ingredientsId}
              onClick={() => setShowIngredients((value) => !value)}
            >
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">
                {showIngredients ? "Steps" : "Ingredients"}
              </span>
            </Button>
          )}
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label="Exit cook mode">
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>
        <Progress
          value={((step + 1) / stepCount) * 100}
          aria-label={`Step ${step + 1} of ${stepCount}`}
          className="h-1 rounded-none"
        />

        {/* Finished timers */}
        {alerts.length > 0 && (
          <div role="alert" className="space-y-2 border-b border-primary/30 bg-primary/10 px-4 py-3 sm:px-6">
            {alerts.map((key) => {
              const stepIndex = Number(key.split(":")[0]);
              return (
                <div key={key} className="flex flex-wrap items-center gap-3">
                  <BellRing
                    className="h-5 w-5 shrink-0 text-primary motion-safe:animate-bounce"
                    aria-hidden="true"
                  />
                  <p className="flex-1 font-medium text-foreground">
                    Time&apos;s up: {durationFor(key)?.text} (step {stepIndex + 1})
                  </p>
                  {stepIndex !== step && (
                    <Button variant="outline" onClick={() => goTo(stepIndex)}>
                      Go to step {stepIndex + 1}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => setAlerts((prev) => prev.filter((k) => k !== key))}
                  >
                    Dismiss
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          {/* Step */}
          <section
            aria-label="Current step"
            className={cn(
              "min-h-0 flex-1 overflow-y-auto",
              showIngredients && "hidden lg:block"
            )}
          >
            <div
              key={step}
              className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 sm:px-12 sm:py-16 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.02em] text-primary">
                Step {step + 1} of {stepCount}
              </p>
              <p className="font-display text-2xl leading-snug font-medium text-foreground sm:text-3xl sm:leading-snug lg:text-4xl lg:leading-tight">
                {splitByDurations(currentStep.text, currentStep.durations).map(
                  (segment, index) =>
                    segment.durationIndex === null ? (
                      <span key={index}>{segment.text}</span>
                    ) : (
                      <span
                        key={index}
                        className="rounded-md bg-primary/10 px-1 text-primary"
                      >
                        {segment.text}
                      </span>
                    )
                )}
              </p>

              {currentStep.durations.length > 0 && (
                <ul className="space-y-3" aria-label="Timers">
                  {currentStep.durations.map((duration, index) => {
                    const key = timerKey(step, index);
                    return (
                      <li key={key}>
                        <StepTimer
                          label={duration.text}
                          seconds={duration.seconds}
                          timer={timerFor(key, duration.seconds)}
                          now={now}
                          onStart={() => handleStart(key, duration.seconds)}
                          onPause={() => handlePause(key)}
                          onReset={() => handleReset(key)}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Ingredients: a side column on large screens, a toggled panel below */}
          {hasIngredients && (
            <aside
              id={ingredientsId}
              aria-label="Ingredients"
              className={cn(
                "min-h-0 w-full overflow-y-auto bg-card lg:block lg:w-80 lg:border-l lg:border-border xl:w-96",
                showIngredients ? "block" : "hidden"
              )}
            >
              <div className="px-6 py-6">
                <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
                  Ingredients
                </h2>
                <ul className="space-y-1">
                  {ingredients.map((ingredient, index) => {
                    const quantity = ingredientQuantity(ingredient);
                    // Keyed by amount too, so rescaling the recipe unticks it.
                    const key = `${ingredient.id || index}|${quantity}`;
                    const checkboxId = `${ingredientsId}-${index}`;
                    const isChecked = checked[key] ?? false;
                    return (
                      <li key={key}>
                        <label
                          htmlFor={checkboxId}
                          className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
                        >
                          <Checkbox
                            id={checkboxId}
                            checked={isChecked}
                            onCheckedChange={(value) =>
                              setChecked((prev) => ({ ...prev, [key]: value === true }))
                            }
                            className="mt-0.5 size-5"
                          />
                          <span
                            className={cn(
                              "text-foreground",
                              isChecked && "line-through opacity-60"
                            )}
                          >
                            {quantity && <span className="font-medium">{quantity} </span>}
                            {ingredient.text}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>
          )}
        </div>

        {/* Timers still going on other steps */}
        {otherTimers.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border px-4 py-2 sm:px-6">
            {otherTimers.map(([key, timer]) => {
              const stepIndex = Number(key.split(":")[0]);
              const remaining = timerRemaining(timer, now);
              return (
                <Button
                  key={key}
                  variant="outline"
                  onClick={() => goTo(stepIndex)}
                  className={cn(timer.status === "done" && "border-primary text-primary")}
                  aria-label={`Step ${stepIndex + 1} timer, ${
                    timer.status === "done"
                      ? "done"
                      : `${describeDuration(Math.ceil(remaining / 1000))} left${
                          timer.status === "paused" ? ", paused" : ""
                        }`
                  }. Go to step ${stepIndex + 1}`}
                >
                  <Timer className="h-4 w-4" aria-hidden="true" />
                  Step {stepIndex + 1}
                  <span className="font-display tabular-nums">
                    {timer.status === "done" ? "Done" : formatClock(remaining)}
                  </span>
                </Button>
              );
            })}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3 border-t border-border px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 sm:flex-none"
            onClick={() => goTo(step - 1)}
            disabled={step === 0}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Previous
          </Button>
          <div className="hidden flex-1 sm:block" />
          {isLast ? (
            <Button
              ref={nextButtonRef}
              size="lg"
              className="flex-1 sm:flex-none"
              onClick={handleFinish}
            >
              <Check className="h-5 w-5" aria-hidden="true" />
              Finish
            </Button>
          ) : (
            <Button
              ref={nextButtonRef}
              size="lg"
              className="flex-1 sm:flex-none"
              onClick={() => goTo(step + 1)}
            >
              Next
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          )}
        </div>

        {/* Screen readers hear each step as it comes up */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {open ? `Step ${step + 1} of ${stepCount}. ${currentStep.text}` : ""}
        </p>
      </DialogContent>
    </Dialog>
  );
}

interface StepTimerProps {
  label: string;
  seconds: number;
  timer: TimerState;
  now: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

function StepTimer({ label, seconds, timer, now, onStart, onPause, onReset }: StepTimerProps) {
  const remaining = timerRemaining(timer, now);
  const isDone = timer.status === "done";
  const isRunning = timer.status === "running";
  const startLabel =
    timer.status === "paused" ? "Resume" : isDone ? "Restart" : "Start";

  return (
    <div
      role="group"
      aria-label={`Timer for ${label}`}
      className={cn(
        "flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
        isDone && "border-primary bg-primary/5"
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
        {isDone ? (
          <BellRing className="h-6 w-6 text-primary" aria-hidden="true" />
        ) : (
          <Timer className="h-6 w-6 text-primary" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-32 flex-1">
        <p
          role="timer"
          className={cn(
            "font-display text-3xl font-semibold tabular-nums text-foreground",
            isDone && "text-primary"
          )}
        >
          {isDone ? "Done" : formatClock(remaining)}
        </p>
        <p className="text-sm text-muted-foreground">
          {describeDuration(seconds)}
          {timer.status === "paused" && " · paused"}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {isRunning ? (
          <Button variant="outline" onClick={onPause}>
            <Pause className="h-4 w-4" aria-hidden="true" />
            Pause
          </Button>
        ) : (
          <Button variant="outline" onClick={onStart}>
            <Play className="h-4 w-4" aria-hidden="true" />
            {startLabel}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onReset}
          disabled={timer.status === "idle"}
          aria-label={`Reset ${label} timer`}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
