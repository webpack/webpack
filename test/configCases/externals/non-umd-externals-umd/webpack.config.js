/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		libraryTarget: "umd"
	},
	externals: {
		external0: "external0",
		external1: "var 'abc'"
	}
};
