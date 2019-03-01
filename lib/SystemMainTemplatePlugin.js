/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Joel Denning @joeldenning
 */

"use strict";

const { ConcatSource } = require("webpack-sources");
const Template = require("./Template");

/** @typedef {import("./Compilation")} Compilation */

/**
 * @typedef {Object} SystemMainTemplatePluginOptions
 * @param {string=} name the library name
 */

class SystemMainTemplatePlugin {
	/**
	 * @param {SystemMainTemplatePluginOptions} options the plugin options
	 */
	constructor(options) {
		this.name = options.name;
	}

	/**
	 * @param {Compilation} compilation the compilation instance
	 * @returns {void}
	 */
	apply(compilation) {
		const { mainTemplate, chunkTemplate } = compilation;

		const onRenderWithEntry = (source, chunk, hash) => {
			const externals = chunk.getModules().filter(m => m.external);

			// The name this bundle should be registered as with System
			const name = this.name ? `"${this.name}", ` : ``;

			// The array of dependencies that are external to webpack and will be provided by System
			const systemDependencies = JSON.stringify(
				externals.map(m =>
					typeof m.request === "object" ? m.request.amd : m.request
				)
			);

			// The name of the variable provided by System for exporting
			const dynamicExport = `__WEBPACK_DYNAMIC_EXPORT__`;

			// An array of the internal variable names for the webpack externals
			const externalWebpackNames = externals.map(
				m => `__WEBPACK_EXTERNAL_MODULE_${Template.toIdentifier(`${m.id}`)}__`
			);

			// Declaring variables for the internal variable names for the webpack externals
			const externalVarDeclarations =
				externalWebpackNames.length > 0
					? `\n  var ${externalWebpackNames.join(", ")};`
					: ``;

			// The system.register format requires an array of setter functions for externals.
			const setters =
				externalWebpackNames.length === 0
					? ""
					: `\n    setters: [` +
					  externalWebpackNames
							.map(
								external =>
									`\n      function(module) {` +
									`\n        ${external} = module;` +
									`\n      }`
							)
							.join(",") +
					  `\n    ],`;

			return new ConcatSource(
				`System.register(${name}${systemDependencies}, function(${dynamicExport}) {` +
					externalVarDeclarations +
					`\n  return {` +
					setters +
					`\n    execute: function() {` +
					`\n      ${dynamicExport}(`,
				source,
				`\n      )\n    }\n  };\n});`
			);
		};

		for (const template of [mainTemplate, chunkTemplate]) {
			template.hooks.renderWithEntry.tap(
				"SystemMainTemplatePlugin",
				onRenderWithEntry
			);
		}

		mainTemplate.hooks.globalHashPaths.tap(
			"SystemMainTemplatePlugin",
			paths => {
				if (this.name) {
					paths.push(this.name);
				}
				return paths;
			}
		);

		mainTemplate.hooks.hash.tap("SystemMainTemplatePlugin", hash => {
			hash.update("exports system");
			if (this.name) {
				hash.update(this.name);
			}
		});
	}
}

module.exports = SystemMainTemplatePlugin;
