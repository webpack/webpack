const path = require("path");
const fs = require("fs");
const webpack = require("../../../../");

/** @type {(number, any) => import("../../../../").Configuration} */
const common = (i, options) => ({
	target: "web",
	output: {
		filename: `${i}/[name].js`,
		chunkFilename: `${i}/[name].js`,
		cssFilename: `${i}/[name].css`,
		cssChunkFilename: `${i}/[name].css`,
		assetModuleFilename: `${i}/[name][ext][query]`
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset"
			}
		]
	},
	experiments: {
		css: true
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", compilation => {
					compilation.hooks.processAssets.tap(
						{
							name: "copy-webpack-plugin",
							stage:
								compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
						},
						() => {
							const data = fs.readFileSync(
								path.resolve(__dirname, "./test.js")
							);

							compilation.emitAsset(
								"test.js",
								new webpack.sources.RawSource(data)
							);
						}
					);
				});
			}
		}
	],
	optimization: {
		runtimeChunk: {
			name: entrypoint => `runtime~${entrypoint.name}`
		}
	},
	...options
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	common(0, {
		entry: {
			app: {
				import: "../_images/file.png"
			}
		}
	}),
	common(1, {
		entry: {
			app: ["../_images/file.png", "./entry.js"]
		}
	}),
	common(2, {
		entry: {
			app: ["../_images/file.png", "./entry.css"]
		}
	}),
	common(3, {
		entry: {
			entry1: "../_images/file.png",
			entry2: "./entry.js"
		}
	}),
	common(4, {
		target: "node",
		entry: {
			app: {
				import: "../_images/file.png"
			}
		}
	}),
	common(5, {
		target: "node",
		entry: {
			app: ["../_images/file.png", "./entry.js"]
		}
	}),
	common(6, {
		target: "node",
		entry: {
			app: ["../_images/file.png", "./entry.css"]
		}
	}),
	common(7, {
		target: "node",
		entry: {
			entry1: "../_images/file.png",
			entry2: "./entry.js"
		}
	})
];
