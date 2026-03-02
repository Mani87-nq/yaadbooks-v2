'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useTourStore } from '@/store/tourStore';
import { getTour, type TourDefinition, type TourStep } from './tours';
import { TourSpotlight } from './TourSpotlight';
import { TourTooltip } from './TourTooltip';

// ─── Context ─────────────────────────────────────────────────

interface TourContextValue {
  /** Start a tour by ID */
  startTour: (tourId: string) => void;
  /** Whether any tour is currently active */
  isActive: boolean;
  /** The currently active tour ID */
  activeTourId: string | null;
  /** Check if a specific tour has been completed */
  isTourCompleted: (tourId: string) => boolean;
  /** Reset a tour so it can be replayed */
  resetTour: (tourId: string) => void;
}

const TourContext = createContext<TourContextValue>({
  startTour: () => {},
  isActive: false,
  activeTourId: null,
  isTourCompleted: () => false,
  resetTour: () => {},
});

export function useTourContext() {
  return useContext(TourContext);
}

// ─── Provider ────────────────────────────────────────────────

interface TourProviderProps {
  children: ReactNode;
}

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function TourProvider({ children }: TourProviderProps) {
  // ── Atomic Zustand selectors ──────────────────────────────────
  // useTourStore() without a selector subscribes to the ENTIRE store.
  // Use individual selectors so re-renders only fire when necessary.
  const activeTourId = useTourStore((s) => s.activeTourId);
  const currentStep = useTourStore((s) => s.currentStep);
  const initialized = useTourStore((s) => s.initialized);
  const initialize = useTourStore((s) => s.initialize);
  const storeStartTour = useTourStore((s) => s.startTour);
  const nextStep = useTourStore((s) => s.nextStep);
  const prevStep = useTourStore((s) => s.prevStep);
  const completeTour = useTourStore((s) => s.completeTour);
  const skipTour = useTourStore((s) => s.skipTour);
  const isTourCompleted = useTourStore((s) => s.isTourCompleted);
  const storeResetTour = useTourStore((s) => s.resetTour);

  const [activeTour, setActiveTour] = useState<TourDefinition | null>(null);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  // Initialize on mount
  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  // Resolve the active tour definition when tour ID changes
  useEffect(() => {
    if (activeTourId) {
      const tour = getTour(activeTourId);
      setActiveTour(tour || null);
    } else {
      setActiveTour(null);
      setTargetRect(null);
    }
  }, [activeTourId]);

  // Find and track the target element for the current step
  useEffect(() => {
    if (!activeTour || currentStep >= activeTour.steps.length) {
      setTargetRect(null);
      return;
    }

    const step = activeTour.steps[currentStep];
    if (!step) return;

    const findAndMeasure = () => {
      const el = document.querySelector(step.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        });

        // Scroll element into view if needed
        const isVisible =
          rect.top >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.left >= 0 &&
          rect.right <= window.innerWidth;

        if (!isVisible) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Re-measure after scroll
          setTimeout(() => {
            const newRect = el.getBoundingClientRect();
            setTargetRect({
              x: newRect.x,
              y: newRect.y,
              width: newRect.width,
              height: newRect.height,
            });
          }, 400);
        }
      } else {
        // Element not found — show tooltip without spotlight
        setTargetRect(null);
      }
    };

    // Initial measurement
    findAndMeasure();

    // Re-measure on resize and scroll
    const handleResize = () => findAndMeasure();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [activeTour, currentStep]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!activeTour) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipTour();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep < activeTour.steps.length - 1) {
          nextStep();
        } else {
          completeTour();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStep > 0) {
          prevStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTour, currentStep, nextStep, prevStep, completeTour, skipTour]);

  // Context value
  const startTour = useCallback(
    (tourId: string) => {
      storeStartTour(tourId);
    },
    [storeStartTour]
  );

  const resetTour = useCallback(
    (tourId: string) => {
      storeResetTour(tourId);
    },
    [storeResetTour]
  );

  const contextValue: TourContextValue = {
    startTour,
    isActive: !!activeTourId,
    activeTourId,
    isTourCompleted,
    resetTour,
  };

  // Get current step data
  const currentStepData: TourStep | null =
    activeTour && currentStep < activeTour.steps.length
      ? activeTour.steps[currentStep]
      : null;

  return (
    <TourContext.Provider value={contextValue}>
      {children}

      {/* Tour overlay and tooltip */}
      {activeTour && currentStepData && (
        <>
          <TourSpotlight
            targetRect={targetRect}
            highlight={currentStepData.highlight}
          />
          <TourTooltip
            targetRect={targetRect}
            title={currentStepData.title}
            content={currentStepData.content}
            placement={currentStepData.placement}
            stepNumber={currentStep + 1}
            totalSteps={activeTour.steps.length}
            isFirst={currentStep === 0}
            isLast={currentStep === activeTour.steps.length - 1}
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={skipTour}
            onComplete={completeTour}
          />
        </>
      )}
    </TourContext.Provider>
  );
}
