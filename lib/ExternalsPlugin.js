/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ExternalModule = require("./ExternalModule");
const ExternalModuleFactoryPlugin = require("./ExternalModuleFactoryPlugin");
const ExternalModuleImportDependency = require("./dependencies/ExternalModuleImportDependency");
const ModuleImportDependency = require("./dependencies/ExternalModuleImportDependency");
const ImportDependency = require("./dependencies/ImportDependency");

/** @typedef {import("../declarations/WebpackOptions").Externals} Externals */
/** @typedef {import("./Compiler")} Compiler */

class ExternalsPlugin {
	/**
	 * @param {string | undefined} type default external type
	 * @param {Externals} externals externals config
	 */
	constructor(type, externals) {
		this.type = type;
		this.externals = externals;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compile.tap("ExternalsPlugin", ({ normalModuleFactory }) => {
			new ExternalModuleFactoryPlugin(this.type, this.externals).apply(
				normalModuleFactory
			);
		});

		compiler.hooks.compilation.tap(
			"ExternalsPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					ModuleImportDependency,
					new ModuleImportDependency.Template()
				);

				compilation.hooks.finishModules.tap("ExternalsPlugin", modules => {
					/** @type {ExternalModule} */
					for (const module of modules) {
						if (!(module instanceof ExternalModule)) {
							continue;
						}

						const { request, externalType } =
							module._getRequestAndExternalType();

						if (externalType === "module-import") {
							const moduleGraph = compilation.moduleGraph;
							const connections = moduleGraph.getIncomingConnections(module);
							for (const connection of connections) {
								const originalModule = connection.originModule;
								const connectionDep = connection.dependency;
								if (connectionDep instanceof ImportDependency) {
									const userRequest = connectionDep.userRequest;
									originalModule.blocks.forEach(block => {
										for (const dep of block.dependencies) {
											if (
												dep instanceof ImportDependency &&
												userRequest === dep.request
											) {
												const moduleImportDep =
													new ExternalModuleImportDependency(
														userRequest,
														request,
														dep.range
													);
												originalModule.addPresentationalDependency(
													moduleImportDep
												);
												block.removeDependency(dep);
											}
										}
									});
								}
							}
						}
					}
				});
			}
		);
	}
}

module.exports = ExternalsPlugin;
