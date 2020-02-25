/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, Zackary Jackson @ScriptedAlchemy, Marais Rossouw @maraisr
*/

"use strict";

const Template = require("../Template");
const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");
const propertyAccess = require("../util/propertyAccess");
const ContainerEntryDependency = require("./ContainerEntryDependency");
const ContainerEntryModuleFactory = require("./ContainerEntryModuleFactory");
const ContainerExposedDependency = require("./ContainerExposedDependency");

const validateOptions = require("schema-utils");
const { ConcatSource } = require("webpack-sources");

const schema = require("../../schemas/plugins/ContainerPlugin.json");
const parseOptions = require("./parseOptions");

/** @typedef {import("../Compiler")} Compiler */

const PLUGIN_NAME = "ContainerPlugin";

module.exports = class ContainerPlugin {
	constructor(options) {
		validateOptions(schema, options, { name: PLUGIN_NAME });

		this.options = {
			overridables: options.overridables || null,
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
		if (compiler.options.optimization.runtimeChunk) {
			throw new Error(
				"This plugin cannot integrate with RuntimeChunk plugin, please remote `optimization.runtimeChunk`."
			);
		}

		if (typeof compiler.options.output.jsonpFunction === "undefined") {
			compiler.options.output.jsonpFunction = Template.toIdentifier(
				"webpackJsonp" + this.options.name
			);
		}

		if (typeof compiler.options.output.chunkCallbackName === "undefined") {
			compiler.options.output.chunkCallbackName = Template.toIdentifier(
				"webpackChunk" + this.options.name
			);
		}

		compiler.hooks.make.tapAsync(PLUGIN_NAME, (compilation, callback) => {
			/** @type {Object|any[]} */
			let exposedMap = this.options.exposes;

			if (Array.isArray(this.options.exposes)) {
				exposedMap = {};
				for (const exp of this.options.exposes) {
					// TODO: Check if this regex handles all cases
					exposedMap[exp.replace(/(^(?:[^\w])+)/, "")] = exp;
				}
			}

			compilation.addEntry(
				compilation.options.context,
				new ContainerEntryDependency(exposedMap, this.options.name),
				this.options.name,
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

				compilation.hooks.afterChunks.tap(PLUGIN_NAME, chunks => {
					for (const chunk of chunks) {
						if (chunk.name === this.options.name) {
							chunk.filenameTemplate = this.options.filename;
						}
					}
				});
			}
		);
	}
};
