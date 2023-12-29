/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: ["../defer-runtime/all.js"],
	optimization: {},
	experiments: {
		syncImportAssertion: true,
		deferImport: {
			// asyncModule: "ignore",
			// asyncModule: "proposal"
			asyncModule: "error"
		}
	}
};
