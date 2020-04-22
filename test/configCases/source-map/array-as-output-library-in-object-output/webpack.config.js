/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: "source-map",
	output: {
		library: {
			root: ["Foo", "[name]"],
			amd: "[name]",
			commonjs: "[name]"
		},
		libraryTarget: "umd"
	}
};
