const { resolve, join } = require("path");
const { NormalModule } = require("../../../../");

/**
 * @param {import("../../../../").Compiler} compiler the compiler
 */
var testPlugin = compiler => {
	compiler.hooks.compilation.tap("TestPlugin", compilation => {
		let shouldReplace = false;
		NormalModule.getCompilationHooks(compilation).loader.tap(
			"TestPlugin",
			loaderContext => {
				/** @type {any} */ (loaderContext).shouldReplace = shouldReplace;
			}
		);
		compilation.hooks.finishModules.tapAsync(
			"TestPlugin",
			function (modules, callback) {
				const src = resolve(join(__dirname, "other-file.js"));

				/**
				 *
				 * @param {any} m test
				 * @returns {boolean} test
				 */
				function matcher(m) {
					return m.resource && m.resource === src;
				}

				const module = Array.from(modules).find(matcher);

				if (!module) {
					throw new Error("something went wrong");
				}

				// Check if already build the updated version
				// this will happen when using caching
				if (module.buildInfo._isReplaced) return callback();

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
