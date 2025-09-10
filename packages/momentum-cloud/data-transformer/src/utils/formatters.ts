// packages/momentum-cloud/data-transformer/src/utils/formatters.ts
import { isValid, getYear, getMonth, getDate } from 'date-fns';

// A type for our formatter functions for type safety
type FormatterFunction = (value: any) => any;

// A registry of all available formatting functions
export const formatters: Record<string, FormatterFunction> = {
  'date-year': (value: string | Date): string => {
    const date = new Date(value);
    return isValid(date) ? getYear(date).toString() : '';
  },
  'date-month': (value: string | Date): string => {
    const date = new Date(value);
    // getMonth() is 0-indexed, so we add 1
    return isValid(date) ? (getMonth(date) + 1).toString().padStart(2, '0') : '';
  },
  'date-day': (value: string | Date): string => {
    const date = new Date(value);
    return isValid(date) ? getDate(date).toString().padStart(2, '0') : '';
  },
  'is-terminated': (value: string): boolean => {
    // This makes the logic more robust. It will return true if the status is "Terminated", case-insensitive.
    return typeof value === 'string' && value.toLowerCase() === 'terminated';
  },
};