"use strict";

require("should");

const Template = require("../lib/Template");

describe("Template", () => {
	it("should generate valid identifiers", () =>
		Template.toIdentifier("0abc-def9").should.equal("_0abc_def9"));
	it("should generate valid number identifiers", () => {
		const items = [];
		let item;
		for (let i = 0; i < 80; i += 1) {
			item = Template.numberToIdentifer(i);
			if (item === "") {
				throw new Error("empty number identifier");
			} else if (items.indexOf(item) > -1) {
				throw new Error("duplicate number identifier");
			} else {
				items.push(item);
			}
		}
	});
	it("should generate sanitized path identifiers", () => {
		Template.toPath("path/to-sdfas/sadfome$$.js").should.equal(
			"path-to-sdfas-sadfome$$-js"
		);
	});
});
