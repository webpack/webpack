"use strict";

const plugin = require("./plugin");

expect(require("./plugin")).toBe(plugin);

const localPlugin = {
	applications: 0,
	/**
	 * @param {import("../../../..").Compiler} compiler compiler
	 * @returns {void}
	 */
	apply(compiler) {
		expect(++this.applications).toBe(1);
		compiler.hooks.done.tap("IsolatedPlugin", () => {
			expect(this.applications).toBe(1);
		});
	}
};

/** @type {import("../../../..").Configuration} */
module.exports = {
	devtool: false,
	plugins: [plugin, localPlugin]
};
