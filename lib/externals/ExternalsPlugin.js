/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ConcatenatedModule = require("../optimize/ConcatenatedModule");
const memoize = require("../util/memoize");
const ExternalModuleFactoryPlugin = require("./ExternalModuleFactoryPlugin");

const getExternalModule = memoize(() => require("./ExternalModule"));

/**
 * @import {
 * 	ExternalsType,
 * 	Externals
 * } from "../../declarations/WebpackOptions"
 */
/** @import Compiler from "../Compiler" */
/** @import { Imported } from "./ExternalModule" */
/** @import Dependency from "../graph/Dependency" */

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
			new ExternalModuleFactoryPlugin(
				this.type,
				this.externals,
				compiler.options.output
			).apply(normalModuleFactory);
		});

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			const { concatenatedModuleInfo } =
				ConcatenatedModule.getCompilationHooks(compilation);
			concatenatedModuleInfo.tap(PLUGIN_NAME, (updatedInfo, moduleInfo) => {
				const rawExportMap = updatedInfo.rawExportMap;

				if (!rawExportMap) {
					return;
				}

				const { ModuleExternalInitFragment } = getExternalModule();
				const chunkInitFragments = moduleInfo.chunkInitFragments;
				const moduleExternalInitFragments =
					/** @type {InstanceType<ModuleExternalInitFragment>[]} */
					(
						chunkInitFragments
							? /** @type {(NonNullable<typeof chunkInitFragments>[number] | InstanceType<ModuleExternalInitFragment>)[]} */
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

module.exports = ExternalsPlugin;
