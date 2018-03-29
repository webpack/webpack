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
						{
							name: "CustomPlugin",
							context: true
						},
						context => {
							context.reportProgress(0, "custom category", "custom message");
						}
					);
				});
			}
		}
	]
};
