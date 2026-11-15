"use strict";

const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration[]} */
module.exports = ["resource", "fresh", "retained"].map((identity) => ({
	mode: "development",
	entry: {},
	cache: { type: "memory" },
	plugins: [
		(compiler) => {
			const { Dependency, EntryPlugin, ModuleFactory } = compiler.webpack;
			class ResourceEntryDependency extends Dependency {
				/**
				 * @param {string} key module request
				 * @param {boolean} identifiable whether to expose a resource identifier
				 */
				constructor(key, identifiable) {
					super();
					this.key = key;
					this.identifiable = identifiable;
				}

				/** @returns {string | null} resource identifier */
				getResourceIdentifier() {
					return this.identifiable ? `resource-entry-${this.key}` : null;
				}
			}
			/** @type {Map<string, ResourceEntryDependency>} */
			const retainedEntries = new Map();
			compiler.hooks.compilation.tap(
				"ResourceEntryIdentity",
				(compilation, { normalModuleFactory }) => {
					const factory = new ModuleFactory();
					factory.create = (data, callback) => {
						const dependency = /** @type {ResourceEntryDependency} */ (
							data.dependencies[0]
						);
						normalModuleFactory.create(
							{
								...data,
								dependencies: [
									EntryPlugin.createDependency(dependency.key, { name: "main" })
								]
							},
							callback
						);
					};
					compilation.dependencyFactories.set(ResourceEntryDependency, factory);
				}
			);
			compiler.hooks.make.tapAsync(
				"ResourceEntryIdentity",
				(compilation, callback) => {
					const requests =
						currentWatchStep.step === "0"
							? ["./a.js", "./b.js", "./index.js"]
							: ["./b.js", "./a.js", "./index.js"];
					Promise.all(
						requests.map(
							(request) =>
								new Promise((resolve, reject) => {
									let dependency =
										identity === "retained"
											? retainedEntries.get(request)
											: undefined;
									if (dependency === undefined) {
										dependency = new ResourceEntryDependency(
											request,
											identity === "resource"
										);
										retainedEntries.set(request, dependency);
									}
									compilation.addEntry(
										compiler.context,
										dependency,
										{ name: "main" },
										(error, module) => (error ? reject(error) : resolve(module))
									);
								})
						)
					).then(() => callback(), callback);
				}
			);
		}
	]
}));
