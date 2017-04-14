"use strict";

const should = require("should");

const template = require("../lib/Template");

describe("Template", () => {
	it("should generate valid identifiers", () =>
		template.toIdentifier("0abc-def9").should.equal("_abc_def9"));
	it("should generate valid number identifiers", () => {
		const items = [];
		let item;
		for(let i = 0; i < 80; i += 1) {
			item = template.numberToIdentifer(i);
			if(item === "") {
				throw new Error("empty number identifier");
			} else if(items.indexOf(item) > -1) {
				throw new Error("duplicate number identifier");
			} else {
				items.push(item);
			}
		}
	});
});
