"use strict";

const AbstractMethodError = require("../lib/errors/AbstractMethodError");

// Only Node folds the caller name into the message reliably: JSC (Bun) formats
// Error.stack differently and Deno's V8 stack frames differ too, so the exact
// caller name is asserted on Node only.
const isNode = !process.versions.bun && !process.versions.deno;

describe("AbstractMethodError", () => {
	class Foo {
		abstractMethod() {
			return new AbstractMethodError();
		}
	}

	class Child extends Foo {}

	it("should construct message with caller info", () => {
		const fooClassError = new Foo().abstractMethod();
		const childClassError = new Child().abstractMethod();

		expect(fooClassError.message).toMatch(/Must be overridden\.$/);
		expect(childClassError.message).toMatch(/Must be overridden\.$/);

		if (isNode) {
			expect(fooClassError.message).toBe(
				"Abstract method Foo.abstractMethod. Must be overridden."
			);
			expect(childClassError.message).toBe(
				"Abstract method Child.abstractMethod. Must be overridden."
			);
		}
	});
});
