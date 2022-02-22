/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				css: {
					type: "css",
					enforce: true,
					name: "css"
				}
			}
		}
	},
	externalsPresets: {
		node: true
	},
	node: {
		__dirname: false
	}
};
