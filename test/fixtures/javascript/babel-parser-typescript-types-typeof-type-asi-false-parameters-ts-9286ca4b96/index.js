// https://github.com/microsoft/TypeScript/issues/48711

interface Example {
  (a: number): typeof a

  <T>(): void
};