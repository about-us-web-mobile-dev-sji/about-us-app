import type { ValueTransformer } from 'typeorm';
export const millisecondsTransformer: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) =>
    value === null ? null : Number(value),
};
