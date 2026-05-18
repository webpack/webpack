// ESM module WITHOUT a "module.exports" named export.
// Existing webpack behavior (return the namespace) must be preserved.
export const foo = "foo-value";
export default "default-value";
