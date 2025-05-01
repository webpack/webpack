const { resolve, join } = require("path");
const { NormalModule } = require("../../../../");

/**
 * @typedef {import("../../../../").Module} Module
 */

/**
 * @param {import("../../../../").Compiler} compiler the compiler
 */
const testPlugin = compiler => {
	compiler.hooks.compilation.tap("TestPlugin", compilation => {
		let shouldReplace = false;
		NormalModule.getCompilationHooks(compilation).loader.tap(
			"TestPlugin",
			loaderContext => {
				/** @type {EXPECTED_ANY} */
				(loaderContext).shouldReplace = shouldReplace;
			}
		);
		compilation.hooks.finishModules.tapAsync(
			"TestPlugin",
			function (modules, callback) {
				const src = resolve(join(__dirname, "other-file.js"));

				/**
				 * @param {Module} m test
				 * @returns {boolean | string} test
				 */
				function matcher(m) {
					return (
						/** @type {NormalModule} */ (m).resource &&
						/** @type {NormalModule} */ (m).resource === src
					);
				}

				const module = Array.from(modules).find(matcher);

				if (!module) {
					throw new Error("something went wrong");
				}

				// Check if already build the updated version
				// this will happen when using caching
				if (
					/** @type {NonNullable<Module["buildInfo"]>} */
					(module.buildInfo)._isReplaced
				)
					return callback();

				shouldReplace = true;
				compilation.rebuildModule(module, err => {
					shouldReplace = false;
					callback(err);
				});
			}
		);
	});
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /other-file/,
				use: "./loader"
			}
		]
	},
	optimization: {
		concatenateModules: false
	},
	plugins: [testPlugin]
};
