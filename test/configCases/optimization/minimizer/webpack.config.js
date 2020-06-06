const Compiler = require("../../../../").Compiler;

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		minimize: true,
		minimizer: [
			{
				/**
				 * @param {Compiler} compiler the compiler
				 */
				apply(compiler) {
					expect(compiler).toBeInstanceOf(Compiler);
				}
			},
			/**
			 * @this {Compiler} the compiler
			 * @param {Compiler} compiler the compiler
			 */
			function (compiler) {
				expect(compiler).toBe(this);
				expect(compiler).toBeInstanceOf(Compiler);
			}
		]
	}
};
