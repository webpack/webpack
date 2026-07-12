/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** @typedef {import("../../declarations/WebpackOptions.js").LibraryType} LibraryType */
/** @typedef {import("../Compiler.js").default} Compiler */

/** @typedef {Set<LibraryType>} LibraryTypes */

/** @type {WeakMap<Compiler, LibraryTypes>} */
const enabledTypes = new WeakMap();

/**
 * Defines the enable library plugin options type used by this module.
 * @typedef {object} EnableLibraryPluginOptions
 * @property {() => void=} additionalApply function that runs when applying the current plugin.
 */

/**
 * Returns enabled types.
 * @param {Compiler} compiler the compiler instance
 * @returns {LibraryTypes} enabled types
 */
const getEnabledTypes = (compiler) => {
	let set = enabledTypes.get(compiler);
	if (set === undefined) {
		/** @type {LibraryTypes} */
		set = new Set();
		enabledTypes.set(compiler, set);
	}
	return set;
};

class EnableLibraryPlugin {
	/**
	 * Creates an instance of EnableLibraryPlugin.
	 * @param {LibraryType} type library type that should be available
	 * @param {EnableLibraryPluginOptions} options options of EnableLibraryPlugin
	 */
	constructor(type, options = {}) {
		/** @type {LibraryType} */
		this.type = type;
		/** @type {EnableLibraryPluginOptions} */
		this.options = options;
	}

	/**
	 * Updates enabled using the provided compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @param {LibraryType} type type of library
	 * @returns {void}
	 */
	static setEnabled(compiler, type) {
		getEnabledTypes(compiler).add(type);
	}

	/**
	 * Checks enabled.
	 * @param {Compiler} compiler the compiler instance
	 * @param {LibraryType} type type of library
	 * @returns {void}
	 */
	static checkEnabled(compiler, type) {
		if (!getEnabledTypes(compiler).has(type)) {
			throw new Error(
				`Library type "${type}" is not enabled. ` +
					"EnableLibraryPlugin need to be used to enable this type of library. " +
					'This usually happens through the "output.enabledLibraryTypes" option. ' +
					'If you are using a function as entry which sets "library", you need to add all potential library types to "output.enabledLibraryTypes". ' +
					`These types are enabled: ${[...getEnabledTypes(compiler)].join(", ")}`
			);
		}
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const { type, options } = this;

		// Only enable once
		const enabled = getEnabledTypes(compiler);
		if (enabled.has(type)) return;
		enabled.add(type);

		if (typeof options.additionalApply === "function") {
			options.additionalApply();
		}

		if (typeof type === "string") {
			const enableExportProperty = () => {
				const ExportPropertyLibraryPlugin =
					/** @type {typeof import("./ExportPropertyLibraryPlugin.js").default} */ (
						require("./ExportPropertyLibraryPlugin.js")
					);

				new ExportPropertyLibraryPlugin({
					type
				}).apply(compiler);
			};
			switch (type) {
				case "var": {
					const AssignLibraryPlugin =
						/** @type {typeof import("./AssignLibraryPlugin.js").default} */ (
							require("./AssignLibraryPlugin.js")
						);

					new AssignLibraryPlugin({
						type,
						prefix: [],
						declare: "var",
						unnamed: "error"
					}).apply(compiler);
					break;
				}
				case "assign-properties": {
					const AssignLibraryPlugin =
						/** @type {typeof import("./AssignLibraryPlugin.js").default} */ (
							require("./AssignLibraryPlugin.js")
						);

					new AssignLibraryPlugin({
						type,
						prefix: [],
						declare: false,
						unnamed: "error",
						named: "copy"
					}).apply(compiler);
					break;
				}
				case "assign": {
					const AssignLibraryPlugin =
						/** @type {typeof import("./AssignLibraryPlugin.js").default} */ (
							require("./AssignLibraryPlugin.js")
						);

					new AssignLibraryPlugin({
						type,
						prefix: [],
						declare: false,
						unnamed: "error"
					}).apply(compiler);
					break;
				}
				case "this": {
					const AssignLibraryPlugin =
						/** @type {typeof import("./AssignLibraryPlugin.js").default} */ (
							require("./AssignLibraryPlugin.js")
						);

					new AssignLibraryPlugin({
						type,
						prefix: ["this"],
						declare: false,
						unnamed: "copy"
					}).apply(compiler);
					break;
				}
				case "window": {
					const AssignLibraryPlugin =
						/** @type {typeof import("./AssignLibraryPlugin.js").default} */ (
							require("./AssignLibraryPlugin.js")
						);

					new AssignLibraryPlugin({
						type,
						prefix: ["window"],
						declare: false,
						unnamed: "copy"
					}).apply(compiler);
					break;
				}
				case "self": {
					const AssignLibraryPlugin =
						/** @type {typeof import("./AssignLibraryPlugin.js").default} */ (
							require("./AssignLibraryPlugin.js")
						);

					new AssignLibraryPlugin({
						type,
						prefix: ["self"],
						declare: false,
						unnamed: "copy"
					}).apply(compiler);
					break;
				}
				case "global": {
					const AssignLibraryPlugin =
						/** @type {typeof import("./AssignLibraryPlugin.js").default} */ (
							require("./AssignLibraryPlugin.js")
						);

					new AssignLibraryPlugin({
						type,
						prefix: "global",
						declare: false,
						unnamed: "copy"
					}).apply(compiler);
					break;
				}
				case "commonjs": {
					const AssignLibraryPlugin =
						/** @type {typeof import("./AssignLibraryPlugin.js").default} */ (
							require("./AssignLibraryPlugin.js")
						);

					new AssignLibraryPlugin({
						type,
						prefix: ["exports"],
						declare: false,
						unnamed: "copy"
					}).apply(compiler);
					break;
				}
				case "commonjs-static": {
					const AssignLibraryPlugin =
						/** @type {typeof import("./AssignLibraryPlugin.js").default} */ (
							require("./AssignLibraryPlugin.js")
						);

					new AssignLibraryPlugin({
						type,
						prefix: ["exports"],
						declare: false,
						unnamed: "static"
					}).apply(compiler);
					break;
				}
				case "commonjs2":
				case "commonjs-module": {
					const AssignLibraryPlugin =
						/** @type {typeof import("./AssignLibraryPlugin.js").default} */ (
							require("./AssignLibraryPlugin.js")
						);

					new AssignLibraryPlugin({
						type,
						prefix: ["module", "exports"],
						declare: false,
						unnamed: "assign"
					}).apply(compiler);
					break;
				}
				case "amd":
				case "amd-require": {
					enableExportProperty();

					const AmdLibraryPlugin =
						/** @type {typeof import("./AmdLibraryPlugin.js").default} */ (
							require("./AmdLibraryPlugin.js")
						);

					new AmdLibraryPlugin({
						type,
						requireAsWrapper: type === "amd-require"
					}).apply(compiler);
					break;
				}
				case "umd":
				case "umd2": {
					if (compiler.options.output.iife === false) {
						compiler.options.output.iife = true;

						class WarnFalseIifeUmdPlugin {
							/**
							 * Applies the plugin by registering its hooks on the compiler.
							 * @param {Compiler} compiler the compiler instance
							 */
							apply(compiler) {
								compiler.hooks.thisCompilation.tap(
									"WarnFalseIifeUmdPlugin",
									(compilation) => {
										const FalseIIFEUmdWarning =
											/** @type {typeof import("./FalseIIFEUmdWarning.js").default} */ (
												require("./FalseIIFEUmdWarning.js")
											);

										compilation.warnings.push(new FalseIIFEUmdWarning());
									}
								);
							}
						}

						new WarnFalseIifeUmdPlugin().apply(compiler);
					}
					enableExportProperty();

					const UmdLibraryPlugin =
						/** @type {typeof import("./UmdLibraryPlugin.js").default} */ (
							require("./UmdLibraryPlugin.js")
						);

					new UmdLibraryPlugin({
						type,
						optionalAmdExternalAsGlobal: type === "umd2"
					}).apply(compiler);
					break;
				}
				case "system": {
					enableExportProperty();

					const SystemLibraryPlugin =
						/** @type {typeof import("./SystemLibraryPlugin.js").default} */ (
							require("./SystemLibraryPlugin.js")
						);

					new SystemLibraryPlugin({
						type
					}).apply(compiler);
					break;
				}
				case "jsonp": {
					enableExportProperty();

					const JsonpLibraryPlugin =
						/** @type {typeof import("./JsonpLibraryPlugin.js").default} */ (
							require("./JsonpLibraryPlugin.js")
						);

					new JsonpLibraryPlugin({
						type
					}).apply(compiler);
					break;
				}
				case "module":
				case "modern-module": {
					const ModuleLibraryPlugin =
						/** @type {typeof import("./ModuleLibraryPlugin.js").default} */ (
							require("./ModuleLibraryPlugin.js")
						);

					new ModuleLibraryPlugin({
						type
					}).apply(compiler);
					break;
				}
				default:
					throw new Error(`Unsupported library type ${type}.
Plugins which provide custom library types must call EnableLibraryPlugin.setEnabled(compiler, type) to disable this error.`);
			}
		} else {
			// TODO support plugin instances here
			// apply them to the compiler
		}
	}
}

export default EnableLibraryPlugin;

export { EnableLibraryPlugin as "module.exports" };
