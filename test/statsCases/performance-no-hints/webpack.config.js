/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: {
		colors: true,
		hash: false,
		entrypoints: true
	},
	performance: {
		hints: false
	}
};
