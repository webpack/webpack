"use strict";

const AbstractMethodError = require("../lib/errors/AbstractMethodError");

// JSC (Bun) formats Error.stack differently than V8, so the caller name folded
// into the message can't be parsed; assert it only on V8 (Node, Deno).
const isV8 = !process.versions.bun;

describe("WebpackError", () => {
	class Foo {
		abstractMethod() {
			return new AbstractMethodError();
		}
	}

	class Child extends Foo {}

	const expectedMessage = "Abstract method $1. Must be overridden.";

	it("should construct message with caller info", () => {
		const fooClassError = new Foo().abstractMethod();
		const childClassError = new Child().abstractMethod();

		expect(fooClassError.message).toMatch(/Must be overridden\.$/);
		expect(childClassError.message).toMatch(/Must be overridden\.$/);

		if (isV8) {
			expect(fooClassError.message).toBe(
				expectedMessage.replace("$1", "Foo.abstractMethod")
			);
			expect(childClassError.message).toBe(
				expectedMessage.replace("$1", "Child.abstractMethod")
			);
		}
	});
});
