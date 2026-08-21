"use strict";

// Holds `make` open without running any code of its own: wall time would call
// it the build's slowest plugin, self time tells waiting from working.
/** @type {import("../../../../").WebpackPluginInstance} */
const waiting = {
	/**
	 * @param {import("../../../../").Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.make.tapAsync(
			"WaitingPlugin",
			/**
			 * @param {import("../../../../").Compilation} compilation the compilation
			 * @param {(err?: Error) => void} callback signals this tap is done
			 * @returns {void}
			 */
			(compilation, callback) => {
				setTimeout(callback, 300);
			}
		);
	}
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		hotspots: true
	},
	plugins: [waiting]
};
