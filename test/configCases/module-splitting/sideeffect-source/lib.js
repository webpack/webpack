const sideEffect = { count: 0 };
sideEffect.count += 1; // top-level side effect keeps the module unsplit
export const eager = "EAGER_VALUE_123";
export const lazy = "SOURCE_SIDEEFFECT_PAYLOAD";
