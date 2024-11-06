/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: {
		main: "./index"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				default: false,
				defaultVendors: false,
				bar: {
					chunks: /foo/,
					test: /bar\.js/,
					name: "split-foo",
					minSize: 1
				}
			}
		}
	}
};
