/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		devtoolNamespace: "mynamespace"
	},
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: "cheap-source-map"
};
