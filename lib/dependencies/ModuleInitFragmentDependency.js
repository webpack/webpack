/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const InitFragment = require("../InitFragment");
const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[string, string[], string | undefined]>} ObjectSerializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[string, string[], string | undefined]>} ObjectDeserializerContext */
/**
 * A dependency that adds an init fragment to the module
 */
class ModuleInitFragmentDependency extends NullDependency {
	/**
	 * Creates an instance of ModuleInitFragmentDependency.
	 * @param {string} initCode the initialization code
	 * @param {string[]} runtimeRequirements runtime requirements
	 * @param {string=} key unique key to avoid emitting the same initialization code twice
	 */
	constructor(initCode, runtimeRequirements, key) {
		super();
		/** @type {string} */
		this.initCode = initCode;
		/** @type {string[]} */
		this.runtimeRequirements = runtimeRequirements;
		/** @type {string | undefined} */
		this.key = key;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this.initCode)
			.write(this.runtimeRequirements)
			.write(this.key);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.initCode = context.read();
		const c1 = context.rest;
		this.runtimeRequirements = c1.read();
		const c2 = c1.rest;
		this.key = c2.read();
		super.deserialize(c2.rest);
	}
}

makeSerializable(
	ModuleInitFragmentDependency,
	"webpack/lib/dependencies/ModuleInitFragmentDependency"
);

ModuleInitFragmentDependency.Template = class ModuleInitFragmentDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { initFragments, runtimeRequirements }) {
		const dep = /** @type {ModuleInitFragmentDependency} */ (dependency);
		for (const req of dep.runtimeRequirements) {
			runtimeRequirements.add(req);
		}
		initFragments.push(
			new InitFragment(
				dep.initCode,
				InitFragment.STAGE_CONSTANTS,
				0,
				dep.key,
				undefined
			)
		);
	}
};

module.exports = ModuleInitFragmentDependency;
