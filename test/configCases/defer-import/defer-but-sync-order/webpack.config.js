/** @type {import("../../../../").Configuration} */
module.exports = {
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
