"use strict";

it("should throw when optionally calling an Object wrapper of null or undefined", () => {
	expect(() => Object(null)?.()).toThrow(TypeError);
	expect(() => Object(undefined)?.()).toThrow(TypeError);
});

it("should evaluate optional call arguments before rejecting an Object wrapper", () => {
	const calls = [];
	expect(() => Object(null)?.(calls.push(1))).toThrow(TypeError);
	expect(calls).toEqual([1]);
});

it("should preserve optional calls of wrapped functions and their receivers", () => {
	const object = {
		/** @returns {boolean} whether the call has no receiver */
		method() {
			return this === undefined;
		}
	};
	expect(Object(object.method)?.()).toBe(true);
	expect(Object(() => 42)?.()).toBe(42);
});
