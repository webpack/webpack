"use strict";

/** @import { Compiler, Configuration } from "../../../../" */

/**
 * @this {Compiler} the compiler
 */
function testPlugin() {
	this.hooks.compilation.tap("TestPlugin", (compilation) => {
		compilation.hooks.finishModules.tapAsync(
			"TestPlugin",
			(_modules, callback) => {
				callback();
			}
		);
	});
}

/** @type {Configuration} */
module.exports = {
	plugins: [testPlugin]
};
