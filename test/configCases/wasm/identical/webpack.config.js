const { CachedSource } = require("webpack-sources");

/** @typedef {import("../../../lib/Compilation")} Compilation */

module.exports = {
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/experimental"
			}
		]
	},
	plugins: [
		function() {
			this.hooks.compilation.tap(
				"Test",
				/**
				 * @param {Compilation} compilation Compilation
				 * @returns {void}
				 */
				compilation => {
					compilation.moduleTemplates.webassembly.hooks.package.tap(
						"Test",
						source => {
							// this is important to make each returned value a new instance
							return new CachedSource(source);
						}
					);
				}
			);
		}
	]
};
