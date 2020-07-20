/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { cachedSetProperty } = require("../util/cleverMerge");
const ContextElementDependency = require("./ContextElementDependency");
const RequireContextDependency = require("./RequireContextDependency");
const RequireContextDependencyParserPlugin = require("./RequireContextDependencyParserPlugin");

/** @typedef {import("../../declarations/WebpackOptions").ResolveOptions} ResolveOptions */
/** @typedef {import("../Compiler")} Compiler */

/** @type {ResolveOptions} */
const EMPTY_RESOLVE_OPTIONS = {};

class RequireContextPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"RequireContextPlugin",
			(compilation, { contextModuleFactory, normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					RequireContextDependency,
					contextModuleFactory
				);
				compilation.dependencyTemplates.set(
					RequireContextDependency,
					new RequireContextDependency.Template()
				);

				compilation.dependencyFactories.set(
					ContextElementDependency,
					normalModuleFactory
				);

				const handler = (parser, parserOptions) => {
					if (
						parserOptions.requireContext !== undefined &&
						!parserOptions.requireContext
					)
						return;

					new RequireContextDependencyParserPlugin().apply(parser);
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("RequireContextPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("RequireContextPlugin", handler);

				contextModuleFactory.hooks.alternativeRequests.tap(
					"RequireContextPlugin",
					(items, options) => {
						if (items.length === 0) return items;

						const finalResolveOptions = compiler.resolverFactory.get(
							"normal",
							cachedSetProperty(
								options.resolveOptions || EMPTY_RESOLVE_OPTIONS,
								"dependencyType",
								options.category
							)
						).options;

						let newItems;
						if (!finalResolveOptions.fullySpecified) {
							newItems = [];
							for (const item of items) {
								const { request, context } = item;
								for (const ext of finalResolveOptions.extensions) {
									if (request.endsWith(ext)) {
										newItems.push({
											context,
											request: request.slice(0, -ext.length)
										});
									}
								}
								if (!finalResolveOptions.enforceExtension) {
									newItems.push(item);
								}
							}
							items = newItems;

							newItems = [];
							for (const obj of items) {
								const { request, context } = obj;
								for (const mainFile of finalResolveOptions.mainFiles) {
									if (request.endsWith(`/${mainFile}`)) {
										newItems.push({
											context,
											request: request.slice(0, -mainFile.length)
										});
										newItems.push({
											context,
											request: request.slice(0, -mainFile.length - 1)
										});
									}
								}
								newItems.push(obj);
							}
							items = newItems;
						}

						return items.map(item => {
							for (const modulesItems of finalResolveOptions.modules) {
								if (Array.isArray(modulesItems)) {
									for (const dir of modulesItems) {
										if (item.request.startsWith(`./${dir}/`)) {
											return {
												context: item.context,
												request: item.request.slice(dir.length + 3)
											};
										}
									}
								} else {
									const dir = modulesItems.replace(/\\/g, "/");
									const fullPath =
										item.context.replace(/\\/g, "/") + item.request.slice(1);
									if (fullPath.startsWith(dir)) {
										return {
											context: item.context,
											request: fullPath.slice(dir.length + 1)
										};
									}
								}
							}
							return item;
						});
					}
				);
			}
		);
	}
}
module.exports = RequireContextPlugin;
