/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		library: "NamedLibrary",
		libraryTarget: "umd",
		umdNamedDefine: true
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
