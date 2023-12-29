/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {},
	experiments: {
		topLevelAwait: true,
		syncImportAssertion: true,
		deferImport: {
			// asyncModule: "ignore",
			// asyncModule: "proposal"
			asyncModule: "error"
		}
	}
};
