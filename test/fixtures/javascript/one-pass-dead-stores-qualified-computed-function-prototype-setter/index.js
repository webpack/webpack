// `Function["prototype"]` through the global object is the same one, so
// a setter put on it runs for a store on a fresh function.
var hits = 0;
Object.defineProperty(globalThis.Function["prototype"], "x", {
	set(value) {
		hits += value;
	},
	configurable: true
});
(function () {}).x = 1;
(() => 0).x = 2;
console.log(hits);
delete globalThis.Function["prototype"].x;
