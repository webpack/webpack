// Top-level body must NOT execute as a side effect of source-phase imports.
throw new Error("module body must not be evaluated for source-phase imports");
export const x = 42;
