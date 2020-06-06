/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Compiler")} Compiler */

class FlagEntryExportAsUsedPlugin {
	constructor(nsObjectUsed, explanation) {
		this.nsObjectUsed = nsObjectUsed;
		this.explanation = explanation;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"FlagEntryExportAsUsedPlugin",
			compilation => {
				const moduleGraph = compilation.moduleGraph;
				compilation.hooks.seal.tap("FlagEntryExportAsUsedPlugin", () => {
					for (const { dependencies: deps } of compilation.entries.values()) {
						for (const dep of deps) {
							const module = moduleGraph.getModule(dep);
							if (module) {
								const exportsInfo = moduleGraph.getExportsInfo(module);
								if (this.nsObjectUsed) {
									exportsInfo.setUsedInUnknownWay();
								} else {
									exportsInfo.setAllKnownExportsUsed();
								}
								moduleGraph.addExtraReason(module, this.explanation);
							}
						}
					}
				});
			}
		);
	}
}

module.exports = FlagEntryExportAsUsedPlugin;
