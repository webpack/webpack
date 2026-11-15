"use strict";

/** @type {import("webpack").Configuration[]} */
const configurations = [];
for (const target of ["node", "async-node", "web", "webworker"]) {
	for (const mode of /** @type {const} */ (["development", "production"])) {
		const name = `${target}-${mode}`;
		configurations.push({
			name,
			target,
			mode,
			devtool: false,
			cache: { type: mode === "development" ? "memory" : "filesystem" },
			output: {
				clean: false,
				filename: `${name}.js`,
				chunkFilename: `${name}.[name].js`,
				hotUpdateChunkFilename: `${name}.[id].[fullhash].hot-update.js`,
				hotUpdateMainFilename: `${name}.[runtime].[fullhash].hot-update.json`,
				uniqueName: name,
				library: { type: "commonjs2" },
				publicPath: "https://test.cases/path/"
			},
			optimization: {
				minimize: false,
				emitOnErrors: false,
				moduleIds: "named",
				chunkIds: "named"
			},
			plugins: [
				(compiler) => {
					new compiler.webpack.HotModuleReplacementPlugin().apply(compiler);
				}
			]
		});
	}
}

module.exports = configurations;
