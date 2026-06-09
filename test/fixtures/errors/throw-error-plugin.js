module.exports = {
	/**
	 * @param {import("../../../").Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("Errors.test-unhandled-throws", (compilation) => {
			throw new Error('foo');
		});
	}
};
