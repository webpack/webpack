/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].js"
	},
	target: "web",
	optimization: {
		splitChunks: {
			chunks: "all",
			cacheGroups: {
				b: {
					test: /b\.js/,
					name: "common",
					enforce: true
				},
				c: {
					test: /c\.js/,
					name: "common",
					enforce: true
				}
			}
		}
	}
};
