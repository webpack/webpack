import * as direct from "./inner.js";

// Only a dynamic import keeps the nested namespace out of a directly rewired
// binding, which is what test262 ns-get-nested-namespace-dflt reads.
it("should hand out a spec namespace for a re-exported star-as namespace", () =>
	import("./m.js").then((outer) => {
		const nested = outer.inner;

		expect(Object.getPrototypeOf(nested)).toBe(null);
		expect(Object.getOwnPropertyNames(nested)).toEqual(["a", "b", "default"]);
		expect(nested.default).toBe(42);
	}));

it("should describe a nested namespace's bindings as the spec does", () =>
	import("./m.js").then((outer) => {
		const outerDescriptor = Object.getOwnPropertyDescriptor(outer, "inner");

		expect(outerDescriptor.enumerable).toBe(true);
		expect(outerDescriptor.writable).toBe(true);
		expect(outerDescriptor.configurable).toBe(false);

		const innerDescriptor = Object.getOwnPropertyDescriptor(
			outer.inner,
			"default"
		);

		expect(innerDescriptor.value).toBe(42);
		expect(innerDescriptor.enumerable).toBe(true);
		expect(innerDescriptor.writable).toBe(true);
		expect(innerDescriptor.configurable).toBe(false);
	}));

it("should reach the same namespace object either way", () =>
	import("./m.js").then((outer) => {
		expect(outer.inner).toBe(direct);
	}));
