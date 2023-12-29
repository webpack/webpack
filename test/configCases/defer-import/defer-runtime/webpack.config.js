/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: ["./all.js"],
	optimization: {
		concatenateModules: false
	},
	experiments: {
		syncImportAssertion: true,
		deferImport: {
			// asyncModule: "ignore",
			// asyncModule: "proposal"
			asyncModule: "error"
		}
	}
};
