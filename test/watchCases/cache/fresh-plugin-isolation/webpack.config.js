"use strict";

const plugin = require("./plugin");

/** @import { Compiler, Configuration } from "../../../.." */

expect(require("./plugin")).toBe(plugin);

const localPlugin = {
	applications: 0,
	/**
	 * @param {Compiler} compiler compiler
	 * @returns {void}
	 */
	apply(compiler) {
		expect(++this.applications).toBe(1);
		compiler.hooks.done.tap("IsolatedPlugin", () => {
			expect(this.applications).toBe(1);
		});
	}
};

/** @type {Configuration} */
module.exports = {
	devtool: false,
	plugins: [plugin, localPlugin]
};
