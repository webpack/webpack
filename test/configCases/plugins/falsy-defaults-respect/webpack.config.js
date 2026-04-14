"use strict";

const ManifestPlugin = require("../../../../lib/ManifestPlugin");
const ProgressPlugin = require("../../../../lib/ProgressPlugin");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	plugins: [
		new ProgressPlugin({
			entries: false,
			modules: false
		}),
		new ManifestPlugin({
			entrypoints: false
		}),
		{
			apply(compiler) {
				compiler.hooks.emit.tap("TestPlugin", (compilation) => {
					const progressPlugin = compiler.options.plugins.find(
						(p) => p instanceof ProgressPlugin
					);
					const manifestPlugin = compiler.options.plugins.find(
						(p) => p instanceof ManifestPlugin
					);

					const results = {
						showEntries: progressPlugin.showEntries,
						showModules: progressPlugin.showModules,
						manifestEntrypoints: manifestPlugin.options.entrypoints
					};

					compilation.assets["results.json"] = {
						source: () => JSON.stringify(results),
						size: () => JSON.stringify(results).length
					};
				});
			}
		}
	]
};
