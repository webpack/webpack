const IgnorePlugin = require("../../../../lib/IgnorePlugin");
module.exports = {
	entry: {
		b: ["./intentionally-missing-module.js"],
		bundle0: ["./index"]
	},
	output: {
		filename: "[name].js"
	},
	plugins: [new IgnorePlugin(/intentionally-missing-module/)],
	node: {
		__dirname: false
	}
};
