"use strict";

const HotModuleReplacementPlugin = require("../lib/HotModuleReplacementPlugin");
const JavascriptParser = require("../lib/javascript/JavascriptParser");

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

	it("rejects anything that is not a JavascriptParser", () => {
		expect(() =>
			HotModuleReplacementPlugin.getParserHooks(
				/** @type {EXPECTED_ANY} */ ({})
			)
		).toThrow(TypeError);
	});
});
