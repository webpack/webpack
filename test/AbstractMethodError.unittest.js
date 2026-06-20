"use strict";

const AbstractMethodError = require("../lib/errors/AbstractMethodError");

// TODO JSC (Bun) formats Error.stack differently than V8, so the caller name
// folded into the message can't be parsed the same way.
const itSkipBun = process.versions.bun ? it.skip : it;

describe("WebpackError", () => {
	class Foo {
		abstractMethod() {
			return new AbstractMethodError();
		}
	}

	class Child extends Foo {}

	const expectedMessage = "Abstract method $1. Must be overridden.";

	itSkipBun("should construct message with caller info", () => {
		const fooClassError = new Foo().abstractMethod();
		const childClassError = new Child().abstractMethod();

		expect(fooClassError.message).toBe(
			expectedMessage.replace("$1", "Foo.abstractMethod")
		);
		expect(childClassError.message).toBe(
			expectedMessage.replace("$1", "Child.abstractMethod")
		);
	});
});
