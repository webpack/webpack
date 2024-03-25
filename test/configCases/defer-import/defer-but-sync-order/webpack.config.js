/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		environment: { optionalChaining: parseInt(process.versions.node) >= 14 }
	},
	optimization: {},
	experiments: {
		deferImport: {
			// asyncModule: "ignore",
			// asyncModule: "proposal"
			asyncModule: "error"
		}
	}
};
