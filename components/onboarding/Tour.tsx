'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface TourProps {
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  storageKey?: string; // LocalStorage key to track if tour was completed
}

/**
 * Tour - Onboarding tour component for first-time users
 */
export function Tour({ steps, onComplete, onSkip, storageKey = 'docai-tour-completed' }: TourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Check if tour was already completed
    const completed = localStorage.getItem(storageKey);
    if (completed !== 'true') {
      setIsOpen(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!isOpen) return;

    const step = steps[currentStep];
    if (step?.target) {
      // Find target element
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        setTargetElement(element);
        // Scroll to element
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetElement(null);
      }
    } else {
      setTargetElement(null);
    }
  }, [currentStep, isOpen, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'true');
    setIsOpen(false);
    if (onComplete) {
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(storageKey, 'true');
    setIsOpen(false);
    if (onSkip) {
      onSkip();
    }
  };

  if (!isOpen || steps.length === 0) {
    return null;
  }

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/5 z-40"
        onClick={handleSkip}
      />

      {/* Highlight overlay for target element */}
      {targetElement && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            top: targetElement.offsetTop - 4,
            left: targetElement.offsetLeft - 4,
            width: targetElement.offsetWidth + 8,
            height: targetElement.offsetHeight + 8,
            border: '2px solid hsl(var(--primary))',
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          }}
        />
      )}

      {/* Tour Dialog */}
      <Dialog
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <DialogContent
          className="sm:max-w-md"
          style={
            targetElement
              ? {
                  position: 'fixed',
                  top: targetElement.offsetTop + targetElement.offsetHeight + 16,
                  left: targetElement.offsetLeft,
                  transform: 'none',
                }
              : undefined
          }
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{step.title}</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>{step.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Step {currentStep + 1} of {steps.length}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>

            {/* Step indicators */}
            <div className="flex gap-2 justify-center">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'h-2 w-2 rounded-full transition-colors',
                    index === currentStep ? 'bg-primary' : index < currentStep ? 'bg-primary/50' : 'bg-muted'
                  )}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handleSkip}
                size="sm"
              >
                Skip Tour
              </Button>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  size="sm"
                >
                  {currentStep === steps.length - 1 ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Complete
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Default tour steps for DocAI platform
 */
export const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to DocAI!',
    description: "Let's take a quick tour to help you get started with AI-powered document analysis.",
    position: 'center',
  },
  {
    id: 'upload',
    title: 'Upload Documents',
    description:
      'Click here to upload PDF, DOCX, or XLSX files. Your documents will be processed and analyzed automatically.',
    target: '[data-tour="upload"]',
    position: 'bottom',
  },
  {
    id: 'documents',
    title: 'View Your Documents',
    description: 'All your uploaded documents appear here. Click on any document to view and analyze it.',
    target: '[data-tour="documents"]',
    position: 'bottom',
  },
  {
    id: 'analysis',
    title: 'AI Analysis',
    description: 'Ask questions, get summaries, extract entities, and analyze sentiment, all powered by AI.',
    target: '[data-tour="analysis"]',
    position: 'left',
  },
  {
    id: 'analytics',
    title: 'Analytics Dashboard',
    description: 'Track your usage, view insights, and monitor costs in the analytics dashboard.',
    target: '[data-tour="analytics"]',
    position: 'right',
  },
];
