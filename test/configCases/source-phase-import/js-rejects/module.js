// Just a regular ESM module — its body must never be evaluated as a result
// of a source-phase import.
throw new Error("source-phase JS module body must not be evaluated");
export const x = 42;
