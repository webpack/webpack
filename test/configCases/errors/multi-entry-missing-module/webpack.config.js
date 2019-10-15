const IgnorePlugin = require("../../../../").IgnorePlugin;
module.exports = {
	entry: {
		a: "./intentionally-missing-module.js",
		b: ["./intentionally-missing-module.js"],
		bundle0: ["./index"]
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new IgnorePlugin({
			resourceRegExp: new RegExp(/intentionally-missing-module/)
		})
	]
};
