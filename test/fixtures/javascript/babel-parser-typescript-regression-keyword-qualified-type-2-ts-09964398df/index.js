// These are valid TypeScript syntax (the parser doesn't produce any error),
// but they are always type-checking errors.
interface A extends this.B {}
type T = typeof var.bar;
