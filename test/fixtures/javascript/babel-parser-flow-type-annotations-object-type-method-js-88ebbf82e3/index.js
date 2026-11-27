type T = { a: () => void };
type T1 = { a: <T>() => void };
type T2 = { a(): void };
type T3 = { a<T>(): void };

type T4 = { (): number };
type T5 = { <T>(x: T): number; }

declare class T6 { foo(): number; }
declare class T7 { static foo(): number; }
declare class T8 { (): number }
declare class T9 { static (): number }
