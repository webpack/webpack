"use strict";

const Template = require("../lib/Template");

describe("Template", () => {
	it("should generate valid identifiers", () => {
		expect(Template.toIdentifier("0abc-def9")).toBe("_0abc_def9");
	});
	it("should generate valid number identifiers", () => {
		const items = [];
		let item;
		for (let i = 0; i < 80; i += 1) {
			item = Template.numberToIdentifier(i);
			expect(item).not.toBe("");
			expect(items).not.toContain(item);
			items.push(item);
		}
	});
	it("should generate sanitized path identifiers", () => {
		expect(Template.toPath("path/to-sdfas/sadfome$$.js")).toBe(
			"path-to-sdfas-sadfome$$-js"
		);
	});
});
