const webpack = require("../../../../");
const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /index\.js$/,
				loader: "./loader.js"
			}
		]
	},
	plugins: [
		compiler => {
			compiler.hooks.compilation.tap("Test", compilation => {
				compilation.hooks.succeedModule.tap("Test", module => {
					const fileDeps = new webpack.util.LazySet();
					const contextDeps = new webpack.util.LazySet();
					const missingDeps = new webpack.util.LazySet();
					const buildDeps = new webpack.util.LazySet();
					module.addCacheDependencies(
						fileDeps,
						contextDeps,
						missingDeps,
						buildDeps
					);
					expect(Array.from(fileDeps).sort()).toEqual([
						path.join(__dirname, "index.js"),
						path.join(__dirname, "loader.js")
					]);
					expect(Array.from(contextDeps).sort()).toEqual([
						path.join(__dirname, ".."),
						__dirname
					]);
					expect(Array.from(missingDeps).sort()).toEqual([
						path.join(__dirname, "missing1.js"),
						path.join(__dirname, "missing2.js"),
						path.join(__dirname, "missing3.js"),
						path.join(__dirname, "missing4.js")
					]);
					expect(Array.from(fileDeps).sort()).toEqual([
						path.join(__dirname, "index.js"),
						path.join(__dirname, "loader.js")
					]);
				});
			});
		}
	]
};
