/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { ModuleExternalInitFragment } from "./ExternalModule.js";
import ExternalModuleFactoryPlugin from "./ExternalModuleFactoryPlugin.js";
import ConcatenatedModule from "./optimize/ConcatenatedModule.js";
/** @typedef {import("../declarations/WebpackOptions.js").ExternalsType} ExternalsType */
/** @typedef {import("../declarations/WebpackOptions.js").Externals} Externals */
/** @typedef {import("./Compiler.js").default} Compiler */
/** @typedef {import("./ExternalModule.js").Imported} Imported */
/** @typedef {import("./Dependency.js").default} Dependency */

const PLUGIN_NAME = "ExternalsPlugin";

class ExternalsPlugin {
	/**
	 * Creates an instance of ExternalsPlugin.
	 * @param {ExternalsType | ((dependency: Dependency) => ExternalsType)} type default external type
	 * @param {Externals} externals externals config
	 */
	constructor(type, externals) {
		this.type = type;
		/** @type {Externals} */
		this.externals = externals;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compile.tap(PLUGIN_NAME, ({ normalModuleFactory }) => {
			new ExternalModuleFactoryPlugin(this.type, this.externals).apply(
				normalModuleFactory
			);
		});

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			const { concatenatedModuleInfo } =
				ConcatenatedModule.getCompilationHooks(compilation);
			concatenatedModuleInfo.tap(PLUGIN_NAME, (updatedInfo, moduleInfo) => {
				const rawExportMap = updatedInfo.rawExportMap;

				if (!rawExportMap) {
					return;
				}

				const chunkInitFragments = moduleInfo.chunkInitFragments;
				const moduleExternalInitFragments =
					/** @type {ModuleExternalInitFragment[]} */
					(
						chunkInitFragments
							? /** @type {unknown[]} */
								(chunkInitFragments).filter(
									(fragment) => fragment instanceof ModuleExternalInitFragment
								)
							: []
					);

				let initFragmentChanged = false;

				for (const fragment of moduleExternalInitFragments) {
					const imported = fragment.getImported();

					if (Array.isArray(imported)) {
						const newImported =
							/** @type {Imported} */
							(
								imported.map(([specifier, finalName]) => [
									specifier,
									rawExportMap.has(specifier)
										? rawExportMap.get(specifier)
										: finalName
								])
							);
						fragment.setImported(newImported);
						initFragmentChanged = true;
					}
				}

				if (initFragmentChanged) {
					return true;
				}
			});
		});
	}
}

export default ExternalsPlugin;

export { ExternalsPlugin as "module.exports" };
