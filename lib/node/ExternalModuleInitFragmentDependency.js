/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const NullDependency = require("../dependencies/core/NullDependency");
const DependencyTemplate = require("../template/DependencyTemplate");
const makeSerializable = require("../util/makeSerializable");
const { registerLegacyRequest } = require("../util/serialization");
const ExternalModuleInitFragment = require("./ExternalModuleInitFragment");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import Dependency from "../graph/Dependency" */
/** @import { DependencyTemplateContext } from "../template/DependencyTemplate" */
/**
 * @import {
 * 	ArrayImportSpecifiers
 * } from "./ExternalModuleInitFragment"
 */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[string, ArrayImportSpecifiers, string | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[string, ArrayImportSpecifiers, string | undefined]>} ObjectSerializerContext */

class ExternalModuleInitFragmentDependency extends NullDependency {
	/**
	 * Creates an instance of ExternalModuleInitFragmentDependency.
	 * @param {string} module module
	 * @param {ArrayImportSpecifiers} importSpecifiers import specifiers
	 * @param {string | undefined} defaultImport default import
	 */
	constructor(module, importSpecifiers, defaultImport) {
		super();
		/** @type {string} */
		this.importedModule = module;
		/** @type {ArrayImportSpecifiers} */
		this.specifiers = importSpecifiers;
		/** @type {string | undefined} */
		this.default = defaultImport;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this.importedModule)
			.write(this.specifiers)
			.write(this.default);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.importedModule = context.read();
		const c1 = context.rest;
		this.specifiers = c1.read();
		this.default = c1.rest.read();
	}
}

makeSerializable(
	ExternalModuleInitFragmentDependency,
	"webpack/lib/node/ExternalModuleInitFragmentDependency"
);
registerLegacyRequest(
	ExternalModuleInitFragmentDependency,
	"webpack/lib/dependencies/ExternalModuleInitFragmentDependency"
);

// TODO in the next major release: remove
// Restores caches written before it was renamed from ExternalModuleConstDependency
registerLegacyRequest(
	ExternalModuleInitFragmentDependency,
	"webpack/lib/dependencies/ExternalModuleConstDependency"
);

ExternalModuleInitFragmentDependency.Template = class ExternalModuleInitFragmentDependencyTemplate extends (
	DependencyTemplate
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
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
