/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, Zackary Jackson @ScriptedAlchemy, Marais Rossouw @maraisr
*/

"use strict";

const validateOptions = require("schema-utils");
const { ConcatSource } = require("webpack-sources");
const schema = require("../../schemas/plugins/ContainerPlugin.json");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");
const propertyAccess = require("../util/propertyAccess");
const ContainerEntryDependency = require("./ContainerEntryDependency");
const ContainerEntryModuleFactory = require("./ContainerEntryModuleFactory");
const ContainerExposedDependency = require("./ContainerExposedDependency");
const parseOptions = require("./parseOptions");

/** @typedef {import("../Compiler")} Compiler */

const PLUGIN_NAME = "ContainerPlugin";

module.exports = class ContainerPlugin {
	constructor(options) {
		validateOptions(schema, options, { name: PLUGIN_NAME });

		this.options = {
			overridables: parseOptions(options.overridables),
			name: options.name,
			libraryTarget: options.libraryTarget || "var",
			filename: options.filename || undefined,
			exposes: parseOptions(options.exposes)
		};
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.make.tapAsync(PLUGIN_NAME, (compilation, callback) => {
			const { name, exposes, filename } = this.options;

			const dep = new ContainerEntryDependency(exposes);
			dep.loc = { name };
			compilation.addEntry(
				compilation.options.context,
				dep,
				{
					name,
					filename
				},
				error => {
					if (error) return callback(error);
					callback();
				}
			);
		});

		compiler.hooks.thisCompilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					ContainerEntryDependency,
					new ContainerEntryModuleFactory()
				);

				compilation.dependencyFactories.set(
					ContainerExposedDependency,
					normalModuleFactory
				);

				// TODO: refactor to new library system
				const { name } = this.options;

				compilation.hooks.additionalTreeRuntimeRequirements.tap(
					PLUGIN_NAME,
					(chunk, set) => {
						if (chunk.name === name)
							set.add(RuntimeGlobals.returnExportsFromRuntime);
					}
				);

				const renderHooks = JavascriptModulesPlugin.getCompilationHooks(
					compilation
				);

				renderHooks.render.tap(PLUGIN_NAME, (source, { chunk }) => {
					if (chunk.name === this.options.name) {
						const libName = Template.toIdentifier(
							compilation.getPath(this.options.name, {
								chunk
							})
						);

						switch (this.options.libraryTarget) {
							case "var": {
								return new ConcatSource(`var ${libName} =`, source);
							}
							case "this":
							case "window":
							case "self":
								return new ConcatSource(
									`${this.options.libraryTarget}${propertyAccess([libName])} =`,
									source
								);
							case "global":
								return new ConcatSource(
									`${compiler.options.output.globalObject}${propertyAccess([
										libName
									])} =`,
									source
								);
							case "commonjs":
							case "commonjs2": {
								return new ConcatSource(
									`exports${propertyAccess([libName])} =`,
									source
								);
							}
							case "amd": // TODO: Solve this?
							case "amd-require": // TODO: Solve this?
							case "umd": // TODO: Solve this?
							case "umd2": // TODO: Solve this?
							case "system": // TODO: Solve this?
							default:
								throw new Error(
									`${this.options.libraryTarget} is not a valid Library target`
								);
						}
					}
				});
			}
		);
	}
};
