"use strict";

const ClassHelpers = require("../lib/util/ClassHelpers");

describe("ClassHelpers", () => {
	class TestClass {}

	const testClass = new TestClass(1, 2);

	it("instance work", () => {
		expect(ClassHelpers.isNotStrictInstance(testClass, TestClass)).toBe(true);
	});

	it("has not same name", () => {
		class TestClass2 {}
		expect(ClassHelpers.isNotStrictInstance(testClass, TestClass2)).toBe(false);
	});

	it("has same name", () => {
		class Hello extends TestClass {
			constructor(a, b) {
				super(a, b);
			}
		}
		expect(ClassHelpers.isNotStrictInstance(new Hello(), TestClass)).toBe(true);
	});
});
