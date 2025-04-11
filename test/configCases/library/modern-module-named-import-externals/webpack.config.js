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
	externals: ["externals0", "externals1"],
	optimization: {
		concatenateModules: true,
		usedExports: true,
	},
	plugins: [
		function () {
			const handler = compilation => {
				compilation.hooks.afterProcessAssets.tap("testcase", assets => {
					const source = assets["test.js"].source();
					expect(source).toMatchSnapshot();
				});
			};
			this.hooks.compilation.tap("testcase", handler);
		}
	]
};
