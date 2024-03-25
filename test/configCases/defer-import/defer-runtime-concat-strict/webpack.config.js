/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: ["../defer-runtime/all.js"],
	output: {
		environment: { optionalChaining: parseInt(process.versions.node) >= 14 }
	},
	optimization: {},
	module: {
		rules: [
			{
				test: /index\.js/,
				type: "javascript/esm"
			}
		]
	},
	experiments: {
		deferImport: {
			// asyncModule: "ignore",
			// asyncModule: "proposal"
			asyncModule: "error"
		}
	}
};
