/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		environment: { optionalChaining: parseInt(process.versions.node) >= 14 }
	},
	optimization: {},
	experiments: {
		topLevelAwait: true,
		deferImport: {
			// asyncModule: "ignore",
			// asyncModule: "proposal"
			asyncModule: "error"
		}
	}
};
