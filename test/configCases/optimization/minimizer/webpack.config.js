const Compiler = require("../../../../lib/Compiler");

module.exports = {
	optimization: {
		minimize: true,
		minimizer: [
			{
				apply(compiler) {
					expect(compiler).toBeInstanceOf(Compiler);
				}
			},
			function(compiler) {
				expect(compiler).toBe(this);
				expect(compiler).toBeInstanceOf(Compiler);
			}
		]
	}
};
