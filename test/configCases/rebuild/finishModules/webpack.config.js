const { resolve, join } = require("path");

/**
 * @this {import("../../../../").Compiler} the compiler
 */
var testPlugin = function () {
	this.hooks.compilation.tap("TestPlugin", compilation => {
		compilation.hooks.finishModules.tapAsync("TestPlugin", function (
			modules,
			callback
		) {
			const src = resolve(join(__dirname, "other-file.js"));

			/**
			 *
			 * @param {any} m test
			 * @returns {boolean} test
			 */
			function matcher(m) {
				return m.resource && m.resource === src;
			}

			const module = Array.from(compilation.modules).find(matcher);
			/** @type {any} */
			const inputFileSystem = compilation.inputFileSystem;
			const cachedFileInput = inputFileSystem._readFileBackend._data.get(src);
			cachedFileInput.result = `module.exports = { foo: { foo: 'bar' }, doThings: () => { }}`;

			if (!module) {
				throw new Error("something went wrong");
			}

			compilation.rebuildModule(module, () => {
				callback();
			});
		});
	});
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [testPlugin]
};
