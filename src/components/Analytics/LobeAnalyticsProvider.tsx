'use client';

import { createSingletonAnalytics } from '@lobehub/analytics';
import { AnalyticsProvider } from '@lobehub/analytics/react';
import { ReactNode, memo, useMemo } from 'react';

import { BUSINESS_LINE } from '@/const/analytics';
import { isDesktop } from '@/const/version';
import { isDev } from '@/utils/env';

type Props = {
  children: ReactNode;
  debugPosthog: boolean;
  ga4Enabled: boolean;
  ga4MeasurementId: string;
  posthogEnabled: boolean;
  posthogHost: string;
  posthogToken: string;
};

let analyticsInstance: ReturnType<typeof createSingletonAnalytics> | null = null;

export const LobeAnalyticsProvider = memo(
  ({
    children,
    posthogHost,
    posthogToken,
    posthogEnabled,
    debugPosthog,
    ga4MeasurementId,
    ga4Enabled,
  }: Props) => {
    const analytics = useMemo(() => {
      if (analyticsInstance) {
        return analyticsInstance;
      }

      analyticsInstance = createSingletonAnalytics({
        business: BUSINESS_LINE,
        debug: isDev,
        providers: {
          ga4: {
            debug: isDev,
            enabled: ga4Enabled,
            gtagConfig: {
              debug_mode: isDev,
            },
            measurementId: ga4MeasurementId,
          },
          posthog: {
            debug: debugPosthog,
            enabled: posthogEnabled,
            host: posthogHost,
            key: posthogToken,
            person_profiles: 'always',
          },
        },
      });

      return analyticsInstance;
    }, []);

    if (!analytics) return children;

    return (
      <AnalyticsProvider
        client={analytics}
        onInitializeSuccess={() => {
          analyticsInstance?.setGlobalContext({
            platform: isDesktop ? 'desktop' : 'web',
          });

          analyticsInstance
            ?.getProvider('posthog')
            ?.getNativeInstance()
            ?.register({
              platform: isDesktop ? 'desktop' : 'web',
            });
        }}
      >
        {children}
      </AnalyticsProvider>
    );
  },
  () => true,
);
