export function foo4() {};
export const { a: [{ foo4: foo }], b, c: { foo2: [{ foo3: foo4 }] } } = bar;
