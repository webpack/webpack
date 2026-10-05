"use strict";

const state = require("./state.json");

module.exports = {
	/**
	 * @param {import("../../../..").Compiler} compiler compiler
	 * @returns {void}
	 */
	apply(compiler) {
		expect(++state.applications).toBe(1);
		compiler.hooks.done.tap("IsolatedImportedPlugin", () => {
			expect(state.applications).toBe(1);
		});
	}
};
