const path = require("path");
const webpack = require("../../../../");
const data = require("./data");
/** @type {import("../../../../").Configuration} */
module.exports = {
	externals: {
		data: "commonjs " + path.resolve(__dirname, "data.js")
	},
	plugins: [
		new webpack.ProgressPlugin((value, ...messages) => {
			data.push(messages.join("|"));
		}),
		{
			apply: compiler => {
				compiler.hooks.compilation.tap("CustomPlugin", compilation => {
					compilation.hooks.optimize.tap("CustomPlugin", () => {
						const reportProgress = webpack.ProgressPlugin.getReporter(compiler);
						reportProgress(0, "custom category", "custom message");
					});
				});
			}
		}
	]
};
