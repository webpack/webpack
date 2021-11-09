/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: "./a.js",
		b: {
			import: "./b.js",
			chunkLoading: false
		}
	},
	output: {
		filename: "[name].js"
	}
};
