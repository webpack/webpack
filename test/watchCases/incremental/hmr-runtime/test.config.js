"use strict";

const path = require("path");

/** @typedef {Record<string, unknown>} RuntimeState */
/** @typedef {{ name: string, context: string, output: { path: string, filename: string } }} RuntimeOptions */

module.exports = {
	skipFreshCompilation:
		"HMR updates require the running bundle's history; apply them in one retained runtime and assert its state instead.",
	/**
	 * @param {number} _index configuration index
	 * @param {RuntimeOptions} options compiler options
	 * @returns {string} assertions for the current watch step
	 */
	findBundle: (_index, options) => path.join(options.context, "test.js"),
	/**
	 * @param {{ STATE: Record<string, RuntimeState>, HMR_STATE?: RuntimeState, BUNDLE_PATH?: string }} scope runtime scope
	 * @param {RuntimeOptions} options compiler options
	 * @returns {void}
	 */
	moduleScope(scope, options) {
		const state = scope.STATE;
		if (!state[options.name]) state[options.name] = {};
		scope.HMR_STATE = state[options.name];
		scope.BUNDLE_PATH = path.join(options.output.path, options.output.filename);
	}
};
