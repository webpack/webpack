import defer * as dep2 from "./dep2.js";

globalThis.dep3Evaluated = false;

// `dep2` is only linked, but its transitive static dependency `index.js` is
// still evaluating (index -> dep1 -> defer dep2 -> index), so forcing the
// deferred namespace must throw without evaluating dep3.
try {
	dep2.foo;
} catch (error) {
	globalThis.deferTransitiveError = error;
}
