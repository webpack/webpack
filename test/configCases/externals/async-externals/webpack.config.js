module.exports = {
	output: {
		libraryTarget: "commonjs-module",
		importFunctionName: "((name) => Promise.resolve({ request: name }))"
	},
	externals: {
		"promise-external":
			"promise new Promise(resolve => setTimeout(() => resolve(42), 100))",
		"failing-promise-external":
			"promise new Promise((resolve, reject) => setTimeout(() => reject(new Error('external reject')), 100))",
		"import-external": ["import /hello/world.js", "request"]
	},
	experiments: {
		importAsync: true
	}
};
