/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: {
		main: "./index",
		sec: "./index2"
	},
	performance: {
		hints: "warning"
	},
	stats: {
		colors: true,
		hash: false,
		entrypoints: true
	}
};
