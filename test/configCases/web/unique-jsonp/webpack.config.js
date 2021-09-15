/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		filename: "[name].js"
	},
	externals: {
		fs: "commonjs2 fs"
	},
	node: {
		__filename: false,
		__dirname: false
	}
};
