"use strict";

const AbstractMethodError = require("../lib/AbstractMethodError");

describe("WebpackError", () => {
	class Foo {
		abstractMethod() {
			throw new AbstractMethodError();
		}
	}

	class Child extends Foo {}

	const expectedMessage = "Abstract method $1. Must be overridden.";

	it("should construct message with caller info", () => {
		expect(() => {
			new Foo().abstractMethod();
		}).toThrow(expectedMessage.replace("$1", "Foo.abstractMethod"));

		expect(() => {
			new Child().abstractMethod();
		}).toThrow(expectedMessage.replace("$1", "Child.abstractMethod"));
	});
});
