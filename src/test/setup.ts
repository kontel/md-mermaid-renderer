import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// `globals: false` means Testing Library's automatic cleanup is not registered,
// so without this each test leaves its DOM behind and later queries match
// elements rendered by earlier tests.
afterEach(cleanup);
