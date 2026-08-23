"use strict";

const HotModuleReplacementPlugin = require("../lib/HotModuleReplacementPlugin");
const getParserHooks = require("../lib/hmr/parserHooks");
const JavascriptParser = require("../lib/javascript/JavascriptParser");

describe("HotModuleReplacementPlugin.getParserHooks", () => {
	it("attaches the hooks once per parser", () => {
		const parser = new JavascriptParser();
		const hooks = HotModuleReplacementPlugin.getParserHooks(parser);

		expect(typeof hooks.hotAcceptCallback.tap).toBe("function");
		expect(typeof hooks.hotAcceptWithoutCallback.tap).toBe("function");
		expect(HotModuleReplacementPlugin.getParserHooks(parser)).toBe(hooks);
		// the static method and the shared module must not keep separate registries
		expect(getParserHooks(parser)).toBe(hooks);
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
		const hooks = getParserHooks(/** @type {any} */ (parser));
		expect(typeof hooks.hotAcceptCallback.tap).toBe("function");
		expect(getParserHooks(/** @type {any} */ (parser))).toBe(hooks);
	});

	it("rejects anything that is not a JavascriptParser", () => {
		expect(() =>
			HotModuleReplacementPlugin.getParserHooks(/** @type {any} */ ({}))
		).toThrow(TypeError);
	});
});
