/**
 * @this {import("../../../../").Compiler} the compiler
 */
function testPlugin() {
	this.hooks.compilation.tap("TestPlugin", compilation => {
		compilation.hooks.finishModules.tapAsync(
			"TestPlugin",
			function (_modules, callback) {
				callback();
			}
		);
	});
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [testPlugin]
};
