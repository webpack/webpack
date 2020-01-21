/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ContextElementDependency = require("./ContextElementDependency");
const RequireContextDependency = require("./RequireContextDependency");

const RequireContextDependencyParserPlugin = require("./RequireContextDependencyParserPlugin");

class RequireContextPlugin {
	constructor(modulesDirectories, extensions, mainFiles) {
		if (!Array.isArray(modulesDirectories)) {
			throw new Error("modulesDirectories must be an array");
		}
		if (!Array.isArray(extensions)) {
			throw new Error("extensions must be an array");
		}
		this.modulesDirectories = modulesDirectories;
		this.extensions = extensions;
		this.mainFiles = mainFiles;
	}

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

				contextModuleFactory.hooks.alternatives.tap(
					"RequireContextPlugin",
					items => {
						if (items.length === 0) return items;
						// TODO use .flat() when min node.js version >= 12
						return [].concat(
							...items.map(obj => {
								const { request, context } = obj;
								return this.extensions
									.filter(ext => request.endsWith(ext))
									.map(ext => ({
										context,
										request: request.slice(0, -ext.length)
									}))
									.concat(obj);
							})
						);
					}
				);

				contextModuleFactory.hooks.alternatives.tap(
					"RequireContextPlugin",
					items => {
						if (items.length === 0) return items;
						const result = [];
						for (const obj of items) {
							const { request, context } = obj;
							for (const mainFile of this.mainFiles) {
								if (request.endsWith(`/${mainFile}`)) {
									result.push({
										context,
										request: request.slice(0, -mainFile.length)
									});
									result.push({
										context,
										request: request.slice(0, -mainFile.length - 1)
									});
								}
							}
							result.push(obj);
						}
						return result;
					}
				);

				contextModuleFactory.hooks.alternatives.tap(
					"RequireContextPlugin",
					items => {
						if (items.length === 0) return items;
						return items.map(obj => {
							for (const dir of this.modulesDirectories) {
								if (obj.request.startsWith(`./${dir}/`)) {
									obj.request = obj.request.slice(dir.length + 3);
									break;
								}
							}
							return obj;
						});
					}
				);
			}
		);
	}
}
module.exports = RequireContextPlugin;
