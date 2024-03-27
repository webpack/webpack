const path = require("path");

module.exports = {
	entry: {
		main: "./example"
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "output.js"
	},
	stats: {
		hash: true,
		builtAt: true,
		relatedAssets: true,
		entrypoints: true,
		chunkGroups: true,
		ids: true,
		modules: false,
		chunks: true,
		chunkRelations: true,
		chunkModules: true,
		dependentModules: true,
		chunkOrigins: true,
		depth: true,
		env: true,
		reasons: true,
		usedExports: true,
		providedExports: true,
		optimizationBailout: true,
		errorDetails: true,
		errorStack: true,
		publicPath: true,
		logging: "none",
		orphanModules: true,
		runtimeModules: true,
		exclude: false,
		modulesSpace: Infinity,
		chunkModulesSpace: Infinity,
		assetsSpace: Infinity,
		reasonsSpace: Infinity,
		children: true
	}
};
