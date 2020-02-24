/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const ExternalsPlugin = require("../ExternalsPlugin");
const RuntimeGlobals = require("../RuntimeGlobals");
const RemoteModule = require("./RemoteModule");
const RemoteRuntimeModule = require("./RemoteRuntimeModule");
const RemoteToExternalDependency = require("./RemoteToExternalDependency");
const parseOptions = require("./parseOptions");

/** @typedef {import("../Compiler")} Compiler */

module.exports = class ContainerReferencePlugin {
	constructor(options) {
		this.remoteType = options.remoteType || "global";
		this.remotes = parseOptions(options.remotes || []);
		this.override = parseOptions(options.override || {});

		// TODO: Apply some validation around what was passed in.
	}

	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const { remotes, remoteType } = this;

		const remoteExternals = {};
		for (const [key, value] of remotes) {
			remoteExternals[`container-reference/${key}`] = value;
		}

		new ExternalsPlugin(remoteType, remoteExternals).apply(compiler);

		compiler.hooks.compilation.tap(
			"ContainerReferencePlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					RemoteToExternalDependency,
					normalModuleFactory
				);

				normalModuleFactory.hooks.factorize.tap(
					"ContainerReferencePlugin",
					data => {
						if (!data.request.includes("!")) {
							for (const [key] of remotes) {
								if (data.request.startsWith(`${key}/`)) {
									return new RemoteModule(
										data.request,
										`container-reference/${key}`,
										data.request.slice(key.length + 1)
									);
								}
							}
						}
					}
				);

				compilation.hooks.additionalTreeRuntimeRequirements.tap(
					"OverridablesPlugin",
					(chunk, set) => {
						set.add(RuntimeGlobals.module);
						set.add(RuntimeGlobals.moduleFactories);
						set.add(RuntimeGlobals.hasOwnProperty);
						set.add(RuntimeGlobals.ensureChunkHandlers);
						compilation.addRuntimeModule(chunk, new RemoteRuntimeModule());
					}
				);
			}
		);
	}
};
