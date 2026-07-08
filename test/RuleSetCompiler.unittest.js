"use strict";

const RuleSetCompiler = require("../lib/rules/RuleSetCompiler");

describe("RuleSetCompiler.hasRuleForResource", () => {
	/**
	 * @param {EXPECTED_ANY} rules module rules (may be intentionally malformed)
	 * @param {string=} resource sample resource path
	 * @returns {boolean} whether a rule handles the resource
	 */
	const has = (rules, resource = "/file.css") =>
		RuleSetCompiler.hasRuleForResource(rules, resource);

	it("returns false for missing rules", () => {
		expect(has(undefined)).toBe(false);
		expect(has([])).toBe(false);
	});

	it('skips falsy entries and the `"..."` spread placeholder', () => {
		expect(has([false, null, "...", 0])).toBe(false);
		expect(has(["...", { test: /\.css$/, use: ["css-loader"] }])).toBe(true);
	});

	it("matches a regexp `test` and requires a loader or type", () => {
		expect(has([{ test: /\.css$/ }])).toBe(false);
		expect(has([{ test: /\.css$/, use: ["css-loader"] }])).toBe(true);
		expect(has([{ test: /\.css$/, loader: "css-loader" }])).toBe(true);
		expect(has([{ test: /\.css$/, type: "asset/source" }])).toBe(true);
	});

	it("supports string, function and array conditions", () => {
		expect(has([{ resource: "/file", use: ["x"] }])).toBe(true);
		expect(
			has([
				{ test: (/** @type {string} */ r) => r.endsWith(".css"), use: ["x"] }
			])
		).toBe(true);
		expect(has([{ test: [/\.js$/, /\.css$/], use: ["x"] }])).toBe(true);
		expect(has([{ include: /\.css$/, use: ["x"] }])).toBe(true);
	});

	it("ignores loaders registered for other extensions", () => {
		expect(has([{ test: /\.js$/, use: ["babel-loader"] }])).toBe(false);
		expect(has([{ test: /\.scss$/, use: ["sass-loader"] }])).toBe(false);
	});

	it("ignores enforce:pre/post loaders (no module type)", () => {
		expect(has([{ test: /\.css$/, enforce: "pre", use: ["stylelint"] }])).toBe(
			false
		);
		expect(has([{ test: /\.css$/, enforce: "post", loader: "x" }])).toBe(false);
	});

	it("detects a filename-scoped regexp via the extension probe", () => {
		expect(has([{ test: /source\.css$/, loader: "css-loader" }])).toBe(true);
		expect(has([{ test: /\.module\.css$/, use: ["x"] }])).toBe(true);
		expect(has([{ test: { or: [/\.js$/, /source\.css$/] }, use: ["x"] }])).toBe(
			true
		);
		expect(has([{ test: { and: [/src/, /source\.css$/] }, use: ["x"] }])).toBe(
			true
		);
	});

	it("recurses into oneOf and nested rules", () => {
		expect(
			has([
				{
					test: /\.css$/,
					oneOf: [
						{ resourceQuery: /raw/, type: "asset/source" },
						{ use: ["css-loader"] }
					]
				}
			])
		).toBe(true);
		expect(has([{ test: /\.css$/, rules: [{ use: ["css-loader"] }] }])).toBe(
			true
		);
		expect(has([{ rules: [{ test: /\.css$/, use: ["x"] }] }])).toBe(true);
	});

	it("returns false for a condition that fails to compile", () => {
		expect(has([{ test: {}, use: ["x"] }])).toBe(false);
		expect(has([{ test: 123, use: ["x"] }])).toBe(false);
	});

	it("works for html and wasm resources", () => {
		expect(
			has([{ test: /\.html$/, loader: "html-loader" }], "/file.html")
		).toBe(true);
		expect(has([{ test: /\.wasm$/, use: ["wasm-loader"] }], "/file.wasm")).toBe(
			true
		);
		expect(has([{ test: /\.css$/, use: ["x"] }], "/file.wasm")).toBe(false);
	});
});
