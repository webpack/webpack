/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const HTMLGenerator = require("./HTMLGenerator");
const HTMLParser = require("./HTMLParser");
const HTMLTemplate = require("./HTMLTemplate");

const {
	HTMLURLDependency,
	HTMLEntryDependency,
	HTMLImportDependency
} = require("./dependencies");

const { SyncBailHook } = require("tapable");
const { ConcatSource } = require("webpack-sources");
const Compilation = require("../Compilation");
const JavascriptModulesPlugin = require("../JavascriptModulesPlugin");

const hooksMap = new WeakMap();

class HTMLModulesPlugin {
	constructor() {
		this.plugin = {
			name: "HTMLModulesPlugin"
		};
	}

	static getHooks(compilation) {
		if (!(compilation instanceof Compilation)) {
			throw new TypeError(
				"The 'compilation' argument must be an instance of Compilation"
			);
		}

		let hooks = hooksMap.get(compilation);

		if (hooks === undefined) {
			hooks = {
				shouldRender: new SyncBailHook(["module", "chunk"])
			};

			hooksMap.set(compilation, hooks);
		}

		return hooks;
	}

	apply(compiler) {
		const { plugin } = this;
		const { compilation } = compiler.hooks;

		compilation.tap(plugin, (compilation, { normalModuleFactory }) => {
			const { createParser, createGenerator } = normalModuleFactory.hooks;

			createParser.for("html").tap(plugin, options => {
				return new HTMLParser(options);
			});

			createGenerator.for("html").tap(plugin, () => {
				return new HTMLGenerator();
			});

			const { moduleGraph } = compilation;

			const js = JavascriptModulesPlugin.getHooks(compilation);
			const html = HTMLModulesPlugin.getHooks(compilation);
			// HTML Components (JS Module (Issuer) => HTML Module)
			//
			// ```
			// import html from './import.html'
			//```
			js.shouldRender.tap(plugin, module => {
				if (module.type === "html") {
					const issuer = moduleGraph.getIssuer(module);

					return issuer && issuer.type.includes("javascript");
				}
			});
			// HTML Components (HTML Module (Issuer) => HTML Module)
			//
			// ```
			// <import src="./import.html"></import>
			//```
			html.shouldRender.tap(plugin, module => {
				if (module.type === "html") {
					const issuer = moduleGraph.getIssuer(module);

					// TODO(michael-ciniawsky)
					// HACK for HTML Entries
					if (!issuer) {
						return true;
					}

					return issuer && issuer.type === "html";
				}
			});

			const { dependencyFactories, dependencyTemplates } = compilation;

			dependencyFactories.set(HTMLURLDependency, normalModuleFactory);
			dependencyFactories.set(HTMLEntryDependency, normalModuleFactory);
			dependencyFactories.set(HTMLImportDependency, normalModuleFactory);

			dependencyTemplates.set(
				HTMLImportDependency,
				new HTMLImportDependency.Template()
			);

			dependencyTemplates.set(
				HTMLEntryDependency,
				new HTMLEntryDependency.Template()
			);

			const { mainTemplate, runtimeTemplate } = compilation;

			mainTemplate.hooks.renderManifest.tap(plugin, (result, options) => {
				const chunk = options.chunk;
				// const output = options.outputOptions;
				const moduleTemplates = options.moduleTemplates;
				const filenameTemplate = "[name].html";
				const dependencyTemplates = options.dependencyTemplates;

				const { chunkGraph } = compilation;

				if (chunk.name !== "index") {
					return;
				}

				result.push({
					render: () =>
						this.renderChunk(
							compilation,
							compilation.mainTemplate,
							moduleTemplates.html,
							{
								chunk,
								dependencyTemplates,
								runtimeTemplate,
								moduleGraph,
								chunkGraph
							}
						),
					filenameTemplate,
					pathOptions: {
						chunkGraph,
						chunk
					},
					identifier: `HTML Chunk ${chunk.id}`,
					hash: null
				});

				return result;
			});
		});
	}

	renderChunk(compilation, chunkTemplate, moduleTemplate, renderContext) {
		const hooks = HTMLModulesPlugin.getHooks(compilation);

		const { chunk } = renderContext;

		const sources = HTMLTemplate.render(
			renderContext,
			module => hooks.shouldRender.call(module, chunk),
			moduleTemplate
		);

		return new ConcatSource(sources);
	}
}

module.exports = HTMLModulesPlugin;
