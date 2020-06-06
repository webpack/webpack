/** @type {import("../../../../").Configuration} */
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
	optimization: {
		splitChunks: {
			cacheGroups: {
				vendor: {
					test: "vendor",
					name: "vendor",
					enforce: true
				}
			}
		}
	},
	node: {
		__filename: false,
		__dirname: false
	}
};
