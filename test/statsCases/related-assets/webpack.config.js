/** @typedef {import("../../../").Compiler} Compiler */
/** @typedef {import("../../../").Configuration} Configuration */

const MCEP = require("mini-css-extract-plugin");
const { Compilation } = require("../../../");

/**
 * @param {string[]} exts extensions
 * @returns {(compiler: Compiler) => void} callback for comperssion
 */
const compression = exts => compiler => {
	compiler.hooks.thisCompilation.tap("Test", compilation => {
		compilation.hooks.processAssets.tap(
			{
				name: "Test",
				stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER
			},
			() => {
				for (const asset of compilation.getAssets()) {
					for (const ext of exts) {
						if (asset.name.endsWith(".jpg")) {
							continue;
						}
						const newFile = `${asset.name}${ext}`;
						compilation.emitAsset(newFile, asset.source);
						compilation.updateAsset(asset.name, asset.source, {
							related: {
								compressed: ["...", newFile]
							}
						});
					}
				}
			}
		);
	});
};

/**
 * @param {string} name name
 * @returns {Configuration} configuration
 */
const base = name => ({
	name,
	mode: "development",
	devtool: "source-map",
	entry: "./index",
	output: {
		filename: `${name}-[name].js`,
		assetModuleFilename: `${name}-[name][ext]`,
		pathinfo: false
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					MCEP.loader,
					{
						loader: "css-loader",
						options: {
							sourceMap: true
						}
					}
				]
			}
		]
	},
	plugins: [
		new MCEP({
			filename: `${name}-[name].css`
		}),
		compression([".br", ".gz"])
	]
});

const baseStats = {
	entrypoints: false,
	modules: false,
	timings: false,
	version: false,
	hash: false,
	builtAt: false,
	errorsCount: false,
	warningsCount: false
};

/** @type {import("../../../").Configuration} */
module.exports = [
	{
		...base("default"),
		stats: {
			...baseStats
		}
	},
	{
		...base("relatedAssets"),
		stats: {
			...baseStats,
			relatedAssets: true
		}
	},
	{
		...base("exclude1"),
		stats: {
			...baseStats,
			relatedAssets: true,
			excludeAssets: /\.(gz|br)$/
		}
	},
	{
		...base("exclude2"),
		stats: {
			...baseStats,
			relatedAssets: true,
			excludeAssets: /\.map$/
		}
	},
	{
		...base("exclude3"),
		stats: {
			...baseStats,
			relatedAssets: true,
			excludeAssets: /chunk/
		}
	}
];
