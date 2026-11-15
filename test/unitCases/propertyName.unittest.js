"use strict";

const {
	propertyName,
	quotedPropertyName
} = require("../../lib/util/property");

describe("propertyName", () => {
	it("quotes special cases", () => {
		expect(propertyName("class")).toBe('"class"');
		expect(propertyName("white space")).toBe('"white space"');
		expect(propertyName("3cc")).toBe('"3cc"');
	});

	it("passes non-special cases through", () => {
		expect(propertyName("a")).toBe("a");
		expect(propertyName("_xyz")).toBe("_xyz");
		expect(propertyName("cc3")).toBe("cc3");
	});

	it("returns a computed key for __proto__", () => {
		expect(propertyName("__proto__")).toBe('["__proto__"]');
		expect(propertyName("__proto")).toBe("__proto");
	});
});

describe("quotedPropertyName", () => {
	it("quotes every name", () => {
		expect(quotedPropertyName("a")).toBe('"a"');
		expect(quotedPropertyName("white space")).toBe('"white space"');
	});

	it("returns a computed key for __proto__", () => {
		expect(quotedPropertyName("__proto__")).toBe('["__proto__"]');
		expect(quotedPropertyName('"__proto__"')).toBe('"\\"__proto__\\""');
	});
});
