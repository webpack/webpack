/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const DependencyTemplate = require("../DependencyTemplate");
const makeSerializable = require("../util/makeSerializable");
const ExternalModuleInitFragment = require("./ExternalModuleInitFragment");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

class ExternalModuleInitFragmentDependency extends NullDependency {
	/**
	 * @param {string} module module
	 * @param {{ name: string, value: string }[]} importSpecifiers import specifiers
	 * @param {string | undefined} defaultImport default import
	 */
	constructor(module, importSpecifiers, defaultImport) {
		super();
		this.importedModule = module;
		this.specifiers = importSpecifiers;
		this.default = defaultImport;
	}

	/**
	 * @returns {string} hash update
	 */
	_createHashUpdate() {
		return `${this.importedModule}${JSON.stringify(this.specifiers)}${
			this.default || "null"
		}`;
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.importedModule);
		write(this.specifiers);
		write(this.default);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.importedModule = read();
		this.specifiers = read();
		this.default = read();
	}
}

makeSerializable(
	ExternalModuleInitFragmentDependency,
	"webpack/lib/dependencies/ExternalModuleConstDependency"
);

ExternalModuleInitFragmentDependency.Template = class ExternalModuleConstDependencyTemplate extends (
	DependencyTemplate
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep =
			/** @type {ExternalModuleInitFragmentDependency} */
			(dependency);
		const { chunkInitFragments, runtimeTemplate } = templateContext;

		chunkInitFragments.push(
			new ExternalModuleInitFragment(
				`${runtimeTemplate.supportNodePrefixForCoreModules() ? "node:" : ""}${
					dep.importedModule
				}`,
				dep.specifiers,
				dep.default
			)
		);
	}
};

module.exports = ExternalModuleInitFragmentDependency;
