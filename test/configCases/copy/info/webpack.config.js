"use strict";

const PLUGIN_NAME = "AssertCopyInfo";

/**
 * Fails the build when a copied asset does not carry the info its pattern asks
 * for, which nothing the bundle itself runs can see.
 */
class AssertCopyInfo {
	/**
	 * @param {import("../../../../").Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: PLUGIN_NAME,
					stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT
				},
				() => {
					/**
					 * @param {string} name name of the asset
					 * @param {string} key key of the asset info
					 * @param {unknown} value expected value
					 * @returns {void}
					 */
					const expectInfo = (name, key, value) => {
						const asset = compilation.getAsset(name);
						if (!asset) throw new Error(`'${name}' was not copied`);
						const actual = /** @type {Record<string, unknown>} */ (asset.info)[
							key
						];
						if (actual !== value) {
							throw new Error(
								`'${name}' has '${key}' of '${String(actual)}', not '${String(value)}'`
							);
						}
					};

					expectInfo("static/a.txt", "immutable", true);
					expectInfo("static/a.txt", "copied", true);
					expectInfo("static/a.txt", "sourceFilename", "files/a.txt");
					expectInfo("from-file/a.txt", "development", true);
					expectInfo("from-file/b.txt", "development", undefined);
				}
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: {
			concurrency: 1,
			patterns: [
				{ from: "files/a.txt", to: "static", info: { immutable: true } },
				{
					from: "files",
					to: "from-file",
					// only the file the pattern picks out carries it
					info: (file) =>
						file.sourceFilename === "files/a.txt" ? { development: true } : {}
				}
			]
		}
	},
	plugins: [new AssertCopyInfo()]
};
