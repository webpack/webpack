module.exports = {
	mode: "production",
	resolve: {
		modules: ["web_modules", "node_modules"],
		extensions: [".json", ".web.js", ".js"]
	},
	resolveLoader: {
		extensions: [
			".json",
			".webpack-loader.js",
			".web-loader.js",
			".loader.js",
			".js"
		],
		mainFields: ["webpackLoader", "loader", "main"]
	},
	optimization: {
		noEmitOnErrors: false,
		minimize: false
	}
};
