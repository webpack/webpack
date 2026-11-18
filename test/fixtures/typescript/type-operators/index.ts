let a: keyof T;
let b: readonly string[];
let c: unique symbol;
let d: T extends infer U ? U : never;
let e: T extends (infer U extends string) ? U : never;
let f: T extends [infer U extends string ? 1 : 2] ? U : never;
let g: (string | number)[];
let h: T[][];
