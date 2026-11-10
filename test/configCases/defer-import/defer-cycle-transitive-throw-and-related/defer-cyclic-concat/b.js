import defer * as a from "./a.js";

// `a` is still evaluating (a -> b -> defer a cycle), so forcing evaluation
// through the deferred namespace must throw a TypeError per the TC39 spec.
try {
	a.foo;
} catch (error) {
	globalThis.deferCyclicError = error;
}
