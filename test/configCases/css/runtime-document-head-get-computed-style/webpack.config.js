/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	output: {
		uniqueName: "test"
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", compilation => {
					compilation.hooks.processAssets.tap(
						{
							name: "Test",
							stage:
								compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE
						},
						assets => {
							const name = "bundle0.css";
							const code = assets[name].source();

							compilation.updateAsset(
								name,
								new compiler.webpack.sources.RawSource(
									`${code}\n\n.after-head { color: red; }`
								)
							);
						}
					);
				});
			}
		}
	],
	experiments: {
		css: true
	}
};
