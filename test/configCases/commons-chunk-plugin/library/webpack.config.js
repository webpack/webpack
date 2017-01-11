var CommonsChunkPlugin = require("../../../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	entry: {
		vendor: ["external0", "./a"],
		main: "./index"
	},
	target: "web",
	output: {
		filename: "[name].js",
		libraryTarget: "umd"
	},
	externals: ["external0", "external1", "external2", "fs", "path"],
	plugins: [
		new CommonsChunkPlugin({
			name: "vendor"
		})
	],
	node: {
		__filename: false,
		__dirname: false
	}
};
