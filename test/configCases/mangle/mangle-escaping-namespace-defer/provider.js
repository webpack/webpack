import defer * as ns from "./dep.js";

// The whole deferred namespace escapes as a value (no tracked member access), so
// it can't be statically tracked. The defer guard must keep it as the special
// deferred namespace instead of the mangleable decoupled (eagerly materialized)
// one, otherwise lazy evaluation would break.
export const getDeferred = () => ns;
