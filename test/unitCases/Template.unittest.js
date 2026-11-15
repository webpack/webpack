"use strict";

const Template = require("../../lib/template/Template");

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

	// cspell:ignore sdfas sadfome
	it("should generate sanitized path identifiers", () => {
		expect(Template.toPath("path/to-sdfas/sadfome$$.js")).toBe(
			"path-to-sdfas-sadfome$$-js"
		);
		expect(Template.toPath("Path/To/Some°§File.JS")).toBe(
			"Path-To-Some°§File-JS"
		);
	});

	it("should keep comment text on one line and the comment open", () => {
		expect(Template.toComment("a*/b\nc")).toBe("/*! a* /b\\nc */");
		expect(Template.toNormalComment("a\r\nb\u2028c\u2029d")).toBe(
			"/* a\\r\\nb\\u2028c\\u2029d */"
		);
		expect(Template.toNormalComment("./a.js")).toBe("/* ./a.js */");
		expect(Template.toNormalComment("")).toBe("");
		expect(Template.toLineComment("a*/b\nc")).toBe("// a*/b\\nc");
	});

	it("should keep comment text from spelling a reserved name of ESM output", () => {
		expect(Template.toComment("./@@webpackFullHash@@/a.js")).toBe(
			"/*! ./@ @webpackFullHash@@/a.js */"
		);
		expect(Template.toNormalComment("a*@@webpackFullHash-0@@/b")).toBe(
			"/* a*@ @webpackFullHash-0@@/b */"
		);
		expect(Template.toLineComment("data:,@@webpack@@webpack")).toBe(
			"// data:,@ @webpack@ @webpack"
		);
		expect(Template.toComment("a@@b @webpack")).toBe("/*! a@@b @webpack */");
	});

	it("should strip JSDoc types from runtime function content but keep other comments", () => {
		const content = Template.getFunctionContent({
			toString: () =>
				[
					"function () {",
					"\t/** @type {number} */",
					"\tvar a = /** @type {EXPECTED_ANY} */ (1);",
					"\t// keep this line comment",
					"\treturn a /* keep */;",
					"}"
				].join("\n")
		});
		expect(content).not.toContain("@type");
		expect(content).toContain("var a = (1);");
		expect(content).toContain("// keep this line comment");
		expect(content).toContain("/* keep */");
	});
});
