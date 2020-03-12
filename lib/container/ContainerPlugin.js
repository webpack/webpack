/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, Zackary Jackson @ScriptedAlchemy, Marais Rossouw @maraisr
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/ContainerPlugin.json");
const ContainerEntryDependency = require("./ContainerEntryDependency");
const ContainerEntryModuleFactory = require("./ContainerEntryModuleFactory");
const ContainerExposedDependency = require("./ContainerExposedDependency");
const parseOptions = require("./parseOptions");

/** @typedef {import("../../declarations/plugins/ContainerPlugin").ContainerPluginOptions} ContainerPluginOptions */
/** @typedef {import("../Compiler")} Compiler */

const PLUGIN_NAME = "ContainerPlugin";

module.exports = class ContainerPlugin {
	/**
	 * @param {ContainerPluginOptions} options options
	 */
	constructor(options) {
		validateOptions(schema, options, { name: PLUGIN_NAME });

		this.options = {
			overridables: parseOptions(options.overridables),
			name: options.name,
			library: options.library || {
				type: "var",
				name: options.name
			},
			filename: options.filename || undefined,
			exposes: parseOptions(options.exposes)
		};
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const { name, exposes, filename, library } = this.options;

		compiler.options.output.enabledLibraryTypes.push(library.type);

		compiler.hooks.make.tapAsync(PLUGIN_NAME, (compilation, callback) => {
			const dep = new ContainerEntryDependency(exposes);
			dep.loc = { name };
			compilation.addEntry(
				compilation.options.context,
				dep,
				{
					name,
					filename,
					library
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
			}
		);
	}
};
