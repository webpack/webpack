/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		// TODO: not sure why CI set optionalChaining to true on Node 10 and fails the test
		environment: {
			optionalChaining: false
		}
	},
	entry: ["../defer-runtime/all.js"],
	optimization: {},
	experiments: {
		deferImport: true
	}
};
