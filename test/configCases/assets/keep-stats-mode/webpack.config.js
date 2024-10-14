const fs = require("fs");
const path = require("path");
const { Compilation } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	devtool: false,
	output: {
		assetModuleFilename: "[name][ext]"
	},
	plugins: [
		compiler => {
			compiler.hooks.compilation.tap("Test", compilation => {
				compilation.hooks.processAssets.tap(
					{
						name: "Test",
						stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE
					},
					() => {
						compilation.updateAsset(
							"file.text",
							compilation.assets["file.text"],
							{
								stats: { mode: 0x755 }
							}
						);
					}
				);
			});

			compiler.hooks.assetEmitted.tap({ name: "Test" }, name => {
				if (name !== "file.text") {
					return;
				}

				let stats;

				try {
					stats = fs.statSync(
						path.join(compiler.options.output.path, "file.text")
					);
				} catch (_err) {
					throw new Error("Can't read stats for `file.text`");
				}

				if (stats.mode !== 0x755) {
					throw new Error("Invalid stats for `file.text`");
				}
			});
		}
	]
};
