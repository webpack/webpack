/** @typedef {import("../../../../").Compilation} Compilation */

/** @type {import("../../../../").Configuration} */
module.exports = {
	externals: {
		"node-commonjs-fs": "fs",
		"node-commonjs-url": "url"
	},
	externalsType: "module-import",
	externalsPresets: {
		node: true
	},
	output: {
		module: true
	},
	target: "node14",
	experiments: {
		outputModule: true
	},
	plugins: [
		function () {
			/**
			 * @param {Compilation} compilation compilation
			 * @returns {void}
			 */
			const handler = compilation => {
				compilation.hooks.afterProcessAssets.tap("testcase", assets => {
					const output = assets["bundle0.mjs"].source();
					expect(output).toContain(
						`module.exports = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("fs");`
					);
				});
			};
			this.hooks.compilation.tap("testcase", handler);
		}
	]
};
