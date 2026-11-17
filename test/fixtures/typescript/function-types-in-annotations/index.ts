let callback: (error: Error | null, ...values: number[]) => void;
let nested: (a: number) => (b: string) => boolean;
let constructor: new () => object;
let abstractConstructor: abstract new () => object;
let grouped: (() => void) | null;
let generic: <T>(value: T) => T;
let destructured: ({ a, b }: { a: number; b: number }) => number;
let optional: (a?: number, b?: string) => void;
let thisParameter: (this: Window, event: Event) => void;
