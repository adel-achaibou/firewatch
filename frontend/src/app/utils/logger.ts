/** Centralized frontend diagnostics. No application logs are printed in production. */
export const logger = {
    info: (...args: unknown[]): void => {
        if (import.meta.env.DEV) console.info(...args);
    },
    warn: (...args: unknown[]): void => {
        if (import.meta.env.DEV) console.warn(...args);
    },
    error: (...args: unknown[]): void => {
        if (import.meta.env.DEV) console.error(...args);
        // Future production monitoring integration goes here.
    },
};
