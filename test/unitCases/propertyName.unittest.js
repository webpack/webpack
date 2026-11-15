"use strict";

const {
	defineOwnProtoProperty,
	propertyName,
	quotedPropertyName,
	renderObjectWithOwnProto
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

describe("renderObjectWithOwnProto", () => {
	/**
	 * @param {{ name: string, value: string }[]} entries entries
	 * @returns {string} object literal
	 */
	const render = (entries) =>
		`{ ${entries.map((e) => `${quotedPropertyName(e.name)}: ${e.value}`).join(", ")} }`;
	const entries = [
		{ name: "a", value: "1" },
		{ name: "__proto__", value: "2" }
	];

	it("keeps the computed key when computed keys are supported", () => {
		expect(renderObjectWithOwnProto(entries, render, true)).toBe(
			'{ "a": 1, ["__proto__"]: 2 }'
		);
	});

	it("defines __proto__ on the object without computed keys", () => {
		const code = renderObjectWithOwnProto(entries, render, false);
		expect(code).toBe(defineOwnProtoProperty('{ "a": 1 }', "2"));
		const object = new Function(`return ${code}`)();
		expect(Object.prototype.hasOwnProperty.call(object, "__proto__")).toBe(
			true
		);
		expect(Object.getPrototypeOf(object)).toBe(Object.prototype);
		expect(Object.keys(object)).toEqual(["a", "__proto__"]);
		expect(object.__proto__).toBe(2);
	});

	it("defines every __proto__ entry without computed keys", () => {
		const code = renderObjectWithOwnProto(
			[...entries, { name: "b", value: "3" }, { name: "__proto__", value: "4" }],
			render,
			false
		);
		expect(code).not.toContain("[");
		const object = new Function(`return ${code}`)();
		expect(Object.getPrototypeOf(object)).toBe(Object.prototype);
		expect(Object.keys(object)).toEqual(["a", "b", "__proto__"]);
		// The last entry wins, as with repeated keys in a literal
		expect(object.__proto__).toBe(4);
	});

	it("renders the literal unchanged without a __proto__ entry", () => {
		expect(renderObjectWithOwnProto([entries[0]], render, false)).toBe(
			'{ "a": 1 }'
		);
	});
});
