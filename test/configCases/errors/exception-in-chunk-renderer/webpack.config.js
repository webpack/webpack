/** @typedef {import("../../../../").Compiler} Compiler */

class ThrowsExceptionInRender {
	/**
	 * @param {Compiler} compiler the compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("ThrowsException", compilation => {
			compilation.hooks.renderManifest.tap("ThrowsException", () => {
				throw new Error("Test exception");
			});
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [new ThrowsExceptionInRender()]
};
