/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "none",
	entry: { main: "./index.js", test: "./test.js" },
	output: {
		module: true,
		library: {
			type: "modern-module"
		},
		filename: "[name].js",
		chunkFormat: "module"
	},
	experiments: {
		outputModule: true
	},
	resolve: {
		extensions: [".js"]
	},
	externalsType: "module",
	externals: ["externals0", "externals1", "externals2", "externals3"],
	optimization: {
		concatenateModules: true,
		usedExports: true
	},
	plugins: [
		function plugin() {
			const handler = (
				/** @type {import("../../../../types").Compilation} */ compilation
			) => {
				compilation.hooks.afterProcessAssets.tap(
					"testcase",
					(
						/** @type {Record<string, import("webpack-sources").Source>} */ assets
					) => {
						const source = assets["test.js"].source();
						expect(source).toMatchSnapshot();
					}
				);
			};
			this.hooks.compilation.tap("testcase", handler);
		}
	]
};
