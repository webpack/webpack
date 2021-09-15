/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: "./index.js",
	output: {
		filename: "[contenthash].js"
	},
	stats: {
		all: false,
		assets: true
	}
};
