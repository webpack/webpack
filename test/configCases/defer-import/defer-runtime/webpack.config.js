/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: ["./all.js"],
	output: {
		environment: { optionalChaining: parseInt(process.versions.node) >= 14 }
	},
	optimization: {
		concatenateModules: false
	},
	experiments: {
		deferImport: {
			// asyncModule: "ignore",
			// asyncModule: "proposal"
			asyncModule: "error"
		}
	}
};
