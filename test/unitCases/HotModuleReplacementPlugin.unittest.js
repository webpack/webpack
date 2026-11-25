"use strict";

const HotModuleReplacementPlugin = require("../../lib/hmr/HotModuleReplacementPlugin");
const JavascriptParser = require("../../lib/javascript/JavascriptParser");

describe("HotModuleReplacementPlugin.getParserHooks", () => {
	it("attaches the hooks once per parser", () => {
		const parser = new JavascriptParser();
		const hooks = HotModuleReplacementPlugin.getParserHooks(parser);

		expect(typeof hooks.hotAcceptCallback.tap).toBe("function");
		expect(typeof hooks.hotAcceptWithoutCallback.tap).toBe("function");
		expect(HotModuleReplacementPlugin.getParserHooks(parser)).toBe(hooks);
		expect(
			HotModuleReplacementPlugin.getParserHooks(new JavascriptParser())
		).not.toBe(hooks);
	});

	it("accepts a parser from another webpack copy", () => {
		// same class name, different constructor identity — `instanceof` rejects it
		class JavascriptParserOtherCopy {}
		Object.defineProperty(JavascriptParserOtherCopy, "name", {
			value: "JavascriptParser"
		});
		const parser = new JavascriptParserOtherCopy();

		expect(parser instanceof JavascriptParser).toBe(false);
		const hooks = HotModuleReplacementPlugin.getParserHooks(
			/** @type {EXPECTED_ANY} */ (parser)
		);
		expect(typeof hooks.hotAcceptCallback.tap).toBe("function");
		expect(
			HotModuleReplacementPlugin.getParserHooks(
				/** @type {EXPECTED_ANY} */ (parser)
			)
		).toBe(hooks);
	});

	it("rejects anything that is not a JavascriptParser", () => {
		expect(() =>
			HotModuleReplacementPlugin.getParserHooks(
				/** @type {EXPECTED_ANY} */ ({})
			)
		).toThrow(TypeError);
	});
});
