import defer * as ns from "./c.js";

// `a.js` (a top-level-await module) is still evaluating; forcing `ns` reaches
// it through the c -> a cycle, so the access must throw a TypeError.
try {
	ns.foo;
} catch (error) {
	globalThis.deferAsyncError = error;
}
