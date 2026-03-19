import { foo } from "./foo.js";

if (typeof define === "undefined") {
	globalThis.define = function (deps, factory) {
		factory();
	};
}

let result;

define(["require"], function (require) {
	result = foo();
});

it("should rename import bindings inside define() in harmony mode", () => {
	expect(result).toBe(42);
});
