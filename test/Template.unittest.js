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

	// cspell:ignore sdfas sadfome
	it("should generate sanitized path identifiers", () => {
		expect(Template.toPath("path/to-sdfas/sadfome$$.js")).toBe(
			"path-to-sdfas-sadfome$$-js"
		);
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

	it("should reject async codeGeneration in renderRuntimeModules", () => {
		/**
		 * @param {() => unknown} codeGeneration codeGeneration implementation
		 * @returns {import("webpack-sources").Source} rendered source
		 */
		const render = (codeGeneration) =>
			Template.renderRuntimeModules(
				[
					/** @type {import("../lib/RuntimeModule")} */
					(
						/** @type {unknown} */ ({
							identifier: () => "runtime-module",
							codeGeneration
						})
					)
				],
				/** @type {EXPECTED_ANY} */ ({
					chunk: { runtime: undefined },
					chunkGraph: {},
					dependencyTemplates: {},
					moduleGraph: {},
					runtimeTemplate: {}
				})
			);

		expect(() => render(() => Promise.resolve({ sources: new Map() }))).toThrow(
			/does not support async codeGeneration/
		);
		expect(() =>
			render(() => ({
				// eslint-disable-next-line unicorn/no-thenable
				then: (/** @type {(value: unknown) => void} */ resolve) =>
					resolve({ sources: new Map() })
			}))
		).toThrow(/does not support async codeGeneration/);
	});
});
