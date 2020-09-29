/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index",
		other: "./other"
	},
	externals: {
		fs: "commonjs fs",
		external: "1+2",
		external2: "3+4",
		external3: "5+6"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	node: {
		__dirname: false,
		__filename: false
	},
	optimization: {
		minimize: false,
		splitChunks: {
			cacheGroups: {
				common: {
					chunks: "initial",
					minSize: 0,
					name: "common"
				}
			}
		}
	}
};
