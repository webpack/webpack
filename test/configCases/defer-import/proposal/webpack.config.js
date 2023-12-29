/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	experiments: {
		syncImportAssertion: true,
		topLevelAwait: true,
		deferImport: {
			// asyncModule: "ignore"
			asyncModule: "proposal"
			// asyncModule: "error"
		}
	}
};
