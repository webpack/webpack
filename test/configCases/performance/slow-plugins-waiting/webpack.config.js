"use strict";

// Holds `make` open for a good while without running any code of its own. Wall
// time from tap to callback would call this the slowest plugin in the build;
// self time is what tells the difference between waiting and working.
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
		slowPlugins: true
	},
	plugins: [waiting]
};
