import { useEffect, useState } from 'react';
import { Joyride, Step, EventData, STATUS } from 'react-joyride';
import { useAuthStore } from '@/stores/authStore';

export default function WalkthroughTour() {
  const { hasSeenTour, markTourAsSeen, isAuthenticated } = useAuthStore();
  const [run, setRun] = useState(false);
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Only show tour for truly new users (never seen tour before)
    if (hasSeenTour === false) {
      // Delay so dashboard data has time to load
      const timer = setTimeout(() => setRun(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, hasSeenTour]);

  if (!run) return null;

  const steps: Step[] = [
    {
      target: 'body',
      content: 'Welcome to your Dashboard! Let us show you around.',
      placement: 'center',
      skipBeacon: true,
    },
    {
      target: '.grid.md\\:grid-cols-2.lg\\:grid-cols-4',
      content: 'These cards give you a quick snapshot of your monthly revenue, active products, and low stock items.',
      placement: 'bottom',
    },
    {
      target: '.md\\:col-span-5',
      content: 'Track your financial performance over the last 6 months here. Revenue vs. Expenditures helps you stay profitable.',
      placement: 'top',
    },
    {
      target: 'nav',
      content: 'Use this sidebar to access core modules like Products, Inventory, Sales, and Settlements.',
      placement: 'right',
    }
  ];

  const handleEvent = (data: EventData) => {
    const { status } = data;
    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      setRun(false);
      markTourAsSeen();
    }
  };

  return (
    // @ts-ignore
    <Joyride
      onEvent={handleEvent}
      run={run}
      steps={steps}
      styles={({
        options: {
          zIndex: 10000,
          primaryColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--card))',
          textColor: 'hsl(var(--card-foreground))',
          arrowColor: 'hsl(var(--card))',
        },
        tooltipContainer: {
          textAlign: 'left',
          borderRadius: '12px',
          padding: '12px',
        },
        buttonNext: {
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
        },
        buttonBack: {
          marginRight: '10px',
          fontSize: '14px',
        },
        buttonSkip: {
          fontSize: '14px',
        }
      } as any)}
    />
  );
}