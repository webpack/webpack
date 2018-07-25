var ResolvePackageFromRootPlugin = require("./ResolvePackageFromRootPlugin");

module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	resolve: {
		plugins: [new ResolvePackageFromRootPlugin(__dirname)]
	},
	stats: {
		chunkModules: false,
		modules: true
	}
};
