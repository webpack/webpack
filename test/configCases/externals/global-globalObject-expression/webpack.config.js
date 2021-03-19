/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		globalObject: "typeof self !== 'undefined' ? self : global || false"
	},
	externals: {
		external: "global EXTERNAL_TEST_GLOBAL"
	}
};
