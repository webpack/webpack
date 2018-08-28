/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const ExternalModule = require("./ExternalModule");
const Template = require("./Template");

/** @typedef {import("./Compilation")} Compilation */

class AmdMainTemplatePlugin {
	/**
	 * @param {string} name the library name
	 */
	constructor(name) {
		/** @type {string} */
		this.name = name;
	}

	/**
	 * @param {Compilation} compilation the compilation instance
	 * @returns {void}
	 */
	apply(compilation) {
		const { mainTemplate, chunkTemplate } = compilation;

		const onRenderWithEntry = (source, chunk, hash) => {
			const chunkGraph = compilation.chunkGraph;
			const modules = chunkGraph
				.getChunkModules(chunk)
				.filter(m => m instanceof ExternalModule);
			const externals = /** @type {ExternalModule[]} */ (modules);
			const externalsDepsArray = JSON.stringify(
				externals.map(
					m =>
						typeof m.request === "object" && !Array.isArray(m.request)
							? m.request.amd
							: m.request
				)
			);
			const externalsArguments = externals
				.map(
					m =>
						`__WEBPACK_EXTERNAL_MODULE_${Template.toIdentifier(
							`${chunkGraph.getModuleId(m)}`
						)}__`
				)
				.join(", ");

			if (this.name) {
				const name = mainTemplate.getAssetPath(this.name, {
					hash,
					chunk
				});

				return new ConcatSource(
					`define(${JSON.stringify(
						name
					)}, ${externalsDepsArray}, function(${externalsArguments}) { return `,
					source,
					"});"
				);
			} else if (externalsArguments) {
				return new ConcatSource(
					`define(${externalsDepsArray}, function(${externalsArguments}) { return `,
					source,
					"});"
				);
			} else {
				return new ConcatSource("define(function() { return ", source, "});");
			}
		};

		for (const template of [mainTemplate, chunkTemplate]) {
			template.hooks.renderWithEntry.tap(
				"AmdMainTemplatePlugin",
				onRenderWithEntry
			);
		}

		mainTemplate.hooks.globalHashPaths.tap("AmdMainTemplatePlugin", paths => {
			if (this.name) {
				paths.push(this.name);
			}
			return paths;
		});

		mainTemplate.hooks.hash.tap("AmdMainTemplatePlugin", hash => {
			hash.update("exports amd");
			hash.update(this.name);
		});
	}
}

module.exports = AmdMainTemplatePlugin;
