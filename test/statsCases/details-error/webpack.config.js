const { WebpackError } = require("../../../");

/** @type {import("../../../").Configuration[]} */
module.exports = [0, 1, 10, 2, 20, 11, 12, 13, 3, 30].map(n => ({
	name: `${n % 10} errors ${(n / 10) | 0} warnings`,
	mode: "development",
	output: {
		filename: `${n}.js`
	},
	entry: "./index.js",
	plugins: [
		compiler => {
			compiler.hooks.compilation.tap("Test", compilation => {
				const err = new WebpackError("Test");
				err.details = "Error details";
				for (let i = n % 10; i > 0; i--) compilation.errors.push(err);
				for (let i = (n / 10) | 0; i > 0; i--) compilation.warnings.push(err);
			});
		}
	]
}));
