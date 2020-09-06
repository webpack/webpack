const { Source } = require("webpack-sources");
const { resolve, join } = require('path');

/**
 * @this {import("../../../../").Compiler} the compiler
 */
var testPlugin = function () {
	this.hooks.compilation.tap("TestPlugin", compilation => {
		compilation.hooks.finishModules.tapAsync("TestPlugin", function (
			modules,
			callback
		) {
			const src = resolve(join(__dirname, 'other-file.js'));
			const module = Array.from(compilation.modules).find(m => m.resource == src)
			const cachedFileInput = compilation.inputFileSystem._readFileBackend._data.get(src)

			cachedFileInput.result = `module.exports = { foo: { foo: 'bar' }, doThings: () => { }}`


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
