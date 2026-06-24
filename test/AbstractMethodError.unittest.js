"use strict";

const AbstractMethodError = require("../lib/errors/AbstractMethodError");

describe("AbstractMethodError", () => {
	class Foo {
		abstractMethod() {
			return new AbstractMethodError();
		}
	}

	class Child extends Foo {}

	// V8 (Node, Deno) prefixes the class onto the stack frame (Foo.abstractMethod);
	// JSC (Bun) reports only the method name. Assert the message shape and that the
	// calling method name is folded in — both hold on every engine.
	const CALLER =
		/^Abstract method [\w.]*abstractMethod\. Must be overridden\.$/;

	it("folds the calling method name into the message", () => {
		expect(new Foo().abstractMethod().message).toMatch(CALLER);
		expect(new Child().abstractMethod().message).toMatch(CALLER);
	});
});
