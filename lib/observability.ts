// Init Sentry + PostHog. Safe-no-op si DSN/API key absentes.
// À appeler depuis app/_layout.tsx avant <RootNav />.

import Constants from 'expo-constants';

let sentryReady = false;
let posthogClient: { capture: (event: string, props?: Record<string, unknown>) => void } | null =
  null;

export function initObservability() {
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (sentryDsn && !sentryReady) {
    try {
      // import paresseux pour éviter de crasher quand le package n'est pas encore installé
      const Sentry = require('@sentry/react-native') as typeof import('@sentry/react-native');
      Sentry.init({
        dsn: sentryDsn,
        environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
        release: `driveapp@${Constants.expoConfig?.version ?? 'dev'}`,
        tracesSampleRate: 0.2,
      });
      sentryReady = true;
    } catch (e) {
      console.warn('Sentry init failed:', e);
    }
  }

  const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com';
  if (posthogKey && !posthogClient) {
    try {
      const { PostHog } = require('posthog-react-native') as typeof import('posthog-react-native');
      posthogClient = new PostHog(posthogKey, { host: posthogHost });
    } catch (e) {
      console.warn('PostHog init failed:', e);
    }
  }
}

export function track(event: string, props?: Record<string, unknown>) {
  posthogClient?.capture(event, props);
}

// Remonte une exception à Sentry (no-op si Sentry n'est pas initialisé).
// Utilisé par l'ErrorBoundary global.
export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!sentryReady) return;
  try {
    const Sentry = require('@sentry/react-native') as typeof import('@sentry/react-native');
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // noop
  }
}

export function identify(userId: string, props?: Record<string, unknown>) {
  if (sentryReady) {
    try {
      const Sentry = require('@sentry/react-native') as typeof import('@sentry/react-native');
      Sentry.setUser({ id: userId, ...props });
    } catch {
      // noop
    }
  }
  if (posthogClient) {
    try {
      (posthogClient as unknown as { identify: (id: string, p?: Record<string, unknown>) => void })
        .identify(userId, props);
    } catch {
      // noop
    }
  }
}

export function reset() {
  if (sentryReady) {
    try {
      const Sentry = require('@sentry/react-native') as typeof import('@sentry/react-native');
      Sentry.setUser(null);
    } catch {
      // noop
    }
  }
  if (posthogClient) {
    try {
      (posthogClient as unknown as { reset: () => void }).reset();
    } catch {
      // noop
    }
  }
}
