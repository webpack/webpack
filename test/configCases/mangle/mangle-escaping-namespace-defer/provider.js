import defer * as ns from "./dep.js";

// The whole deferred namespace escapes as a value with no tracked member access,
// so it cannot be statically tracked. The defer guard must keep it as the deferred
// namespace rather than the mangleable decoupled one, or lazy evaluation breaks.
export const getDeferred = () => ns;
