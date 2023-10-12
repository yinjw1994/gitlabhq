import * as Sentry from '@sentry/browser';
import { captureException } from '~/ci/runner/sentry_utils';

jest.mock('@sentry/browser');

describe('~/ci/runner/sentry_utils', () => {
  describe('captureException', () => {
    const mockError = new Error('Something went wrong!');

    it('error is reported to sentry', () => {
      captureException({ error: mockError });

      expect(Sentry.captureException).toHaveBeenCalledWith(mockError);
    });

    it('error is reported to sentry with a component name', () => {
      const mockComponentName = 'MyComponent';

      captureException({ error: mockError, component: mockComponentName });

      expect(Sentry.captureException).toHaveBeenCalledWith(mockError, {
        tags: {
          vue_component: mockComponentName,
        },
      });
    });
  });
});
