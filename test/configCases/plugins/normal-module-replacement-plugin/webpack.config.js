var NormalModuleReplacementPlugin = require("../../../../lib/NormalModuleReplacementPlugin");

module.exports = {
	node: {
		__filename: false
	},
	entry: {
		bundle0: "./index.js"
	},
	plugins: [new NormalModuleReplacementPlugin(/foo\.js$/, "bar.js")],
	output: {
		filename: "[name].js"
	}
};
