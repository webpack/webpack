var ResolvePackageFromRootPlugin = require("./ResolvePackageFromRootPlugin");

module.exports = {
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	resolve: {
		plugins: [
			new ResolvePackageFromRootPlugin(__dirname)
		]
	},
	stats: {
		chunkModules: false,
		modules: true,
	}
};
