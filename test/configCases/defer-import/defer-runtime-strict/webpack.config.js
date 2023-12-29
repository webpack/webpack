/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: ["../defer-runtime/all.js"],
	optimization: {
		concatenateModules: false
	},
	module: {
		rules: [
			{
				test: /index\.js/,
				type: "javascript/esm"
			}
		]
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
