const a = flag ? (x: number): number => pick<number, string>(x) : null;
const b = flag ? (x: number): string => `${x}` : null;
const c = flag ? (x: number): string => `${x}${pick<A, B>(x)}` : null;
const d = flag ? (x: number): boolean => x < 1 : null;
const e = flag ? (x: number): boolean => x < 1 && x > 0 : null;
const f = flag ? (x: number): number[] => [x, x] : null;
