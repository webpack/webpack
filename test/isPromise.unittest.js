"use strict";

const isPromise = require("../lib/util/isPromise");

describe("isPromise", () => {
	it("should accept native Promises", () => {
		expect(isPromise(Promise.resolve(1))).toBe(true);
		expect(isPromise(new Promise(() => {}))).toBe(true);
	});

	it("should accept Promise-like values", () => {
		// eslint-disable-next-line unicorn/no-thenable
		expect(isPromise({ then() {} })).toBe(true);
	});

	it("should reject values that are not Promise-like", () => {
		expect(isPromise(null)).toBe(false);
		expect(isPromise(undefined)).toBe(false);
		expect(isPromise(0)).toBe(false);
		expect(isPromise("then")).toBe(false);
		expect(isPromise({})).toBe(false);
		// eslint-disable-next-line unicorn/no-thenable
		expect(isPromise({ then: 1 })).toBe(false);
		expect(isPromise(() => {})).toBe(false);
	});
});
