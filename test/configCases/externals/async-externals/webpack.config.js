module.exports = {
	output: {
		libraryTarget: "commonjs-module",
		importFunctionName: "((name) => Promise.resolve({ request: name }))"
	},
	externals: {
		"promise-external":
			"promise new Promise(resolve => setTimeout(() => resolve(42), 100))",
		"module-promise-external":
			"promise new Promise(resolve => setTimeout(() => resolve({ __esModule: true, default: 42, named: true }), 100))",
		"object-promise-external":
			"promise new Promise(resolve => setTimeout(() => resolve({ default: 42, named: true }), 100))",
		"failing-promise-external":
			"promise new Promise((resolve, reject) => setTimeout(() => reject(new Error('external reject')), 100))",
		"import-external": ["import /hello/world.js", "request"]
	}
};
