/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: {
		syncImportAssertion: true,
		topLevelAwait: true,
		deferImport: {
			// asyncModule: "ignore",
			// asyncModule: "proposal",
			asyncModule: "error"
		}
	}
};
