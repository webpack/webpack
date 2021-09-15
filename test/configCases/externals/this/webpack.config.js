/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		concatenateModules: true
	},
	externals: {
		external: "this EXTERNAL_TEST_GLOBAL"
	}
};
