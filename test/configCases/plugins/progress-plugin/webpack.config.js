var webpack = require("../../../../");
var data = require("./data");
module.exports = {
	externals: {
		[__dirname + "/data"]: "commonjs " + __dirname + "/data"
	},
	plugins: [
		new webpack.ProgressPlugin((value, ...messages) => {
			data.push(messages.join("|"));
		}),
		{
			apply: compiler => {
				compiler.hooks.compilation.tap("CustomPlugin", compilation => {
					compilation.hooks.optimize.tap(
						"CustomPlugin",
						() => {
							const reportProgress = webpack.ProgressPlugin.getReporter(compiler);
							reportProgress(0, "custom category", "custom message");
						}
					);
				});
			}
		}
	]
};
