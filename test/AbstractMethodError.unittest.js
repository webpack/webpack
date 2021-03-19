"use strict";

const AbstractMethodError = require("../lib/AbstractMethodError");

describe("WebpackError", () => {
	class Foo {
		abstractMethod() {
			return new AbstractMethodError();
		}
	}

	class Child extends Foo {}

	const expectedMessage = "Abstract method $1. Must be overridden.";
	const expectedNoMethodMessage = "Abstract method. Must be overridden.";

	it("Should construct message with caller info", () => {
		const fooClassError = new Foo().abstractMethod();
		const childClassError = new Child().abstractMethod();

		expect(fooClassError.message).toBe(
			expectedMessage.replace("$1", "Foo.abstractMethod")
		);
		expect(childClassError.message).toBe(
			expectedMessage.replace("$1", "Child.abstractMethod")
		);
	});

	it("Should handle no method name found in stack trace", () => {
		Error.captureStackTrace = jest.fn(ref => {
			ref.stack = "Error:\na\nb\nc";
		});
		const fooClassError = new Foo().abstractMethod();
		expect(fooClassError.message).toBe(expectedNoMethodMessage);
	});
});
