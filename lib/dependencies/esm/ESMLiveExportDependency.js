/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const makeSerializable = require("../../util/makeSerializable");
const { getRuntimeKey } = require("../../util/runtime");
const NullDependency = require("../core/NullDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import Dependency, { DependencyKinds, UpdateHashContext } from "../../graph/Dependency" */
/** @import ModuleGraph, { LiveBinding } from "../../graph/ModuleGraph" */
/** @import Module from "../../module/Module" */
/** @import { DependencyTemplateContext } from "../../template/DependencyTemplate" */
/** @import Hash from "../../util/Hash" */
/** @import { RuntimeSpec } from "../../util/runtime" */
/** @import { Range } from "../../javascript/JavascriptParser" */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<[Range, string[], number[]]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<[Range, string[], number[]]>} ObjectSerializerContext */

/**
 * A module-level `let` a module library may declare in the chunk's scope under a
 * reserved name, so the library exports the binding itself; it holds every reference.
 */
class ESMLiveExportDependency extends NullDependency {
	/**
	 * Creates an instance of ESMLiveExportDependency.
	 * @param {Range} range the `let` keyword up to the first declarator
	 * @param {string[]} names every name the declaration declares
	 * @param {number[]} occurrences flat triples of start, end and `name index * 3 + kind`, a kind from {@link ESMLiveExportDependency.REFERENCE}
	 */
	constructor(range, names, occurrences) {
		super();
		this.range = range;
		this.names = names;
		this.occurrences = occurrences;
	}

	get type() {
		return "harmony live export";
	}

	/**
	 * Returns the names the chunk's scope declares for this runtime, if it does.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {RuntimeSpec} runtime the runtime the module is generated for
	 * @returns {string[] | undefined} the hoisted name of each declared name
	 */
	getHoistedNames(moduleGraph, runtime) {
		const meta = moduleGraph.getMetaIfExisting(
			/** @type {Module} */ (moduleGraph.getParentModule(this))
		);
		const bindings = meta && meta.liveBindings;
		if (bindings === undefined) return;
		const first = bindings.get(this.names[0]);
		if (first === undefined || !first.runtimes.has(getRuntimeKey(runtime))) {
			return;
		}
		return this.names.map(
			(name) => /** @type {LiveBinding} */ (bindings.get(name)).name
		);
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		const hoisted = this.getHoistedNames(
			context.chunkGraph.moduleGraph,
			context.runtime
		);
		if (hoisted !== undefined) hash.update(hoisted.join());
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.range).write(this.names).write(this.occurrences);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.range = context.read();
		const c1 = context.rest;
		this.names = c1.read();
		const c2 = c1.rest;
		this.occurrences = c2.read();
		super.deserialize(c2.rest);
	}
}

makeSerializable(
	ESMLiveExportDependency,
	"webpack/lib/dependencies/esm/ESMLiveExportDependency"
);

ESMLiveExportDependency.Template = class ESMLiveExportDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { moduleGraph, runtime }) {
		const dep = /** @type {ESMLiveExportDependency} */ (dependency);
		const hoisted = dep.getHoistedNames(moduleGraph, runtime);
		if (hoisted === undefined) return;
		source.replace(dep.range[0], dep.range[1] - 1, "");
		const { occurrences, names } = dep;
		for (let i = 0; i < occurrences.length; i += 3) {
			const start = occurrences[i];
			const end = occurrences[i + 1];
			const index = Math.floor(occurrences[i + 2] / 3);
			switch (occurrences[i + 2] % 3) {
				case ESMLiveExportDependency.REFERENCE:
					source.replace(start, end - 1, hoisted[index]);
					break;
				case ESMLiveExportDependency.SHORTHAND:
					source.replace(start, end - 1, `${names[index]}: ${hoisted[index]}`);
					break;
				default:
					// A property key gives the function or class the name the binding did
					source.insert(start, `{ ${names[index]}: `);
					source.insert(end, ` }.${names[index]}`);
			}
		}
	}
};

/** An occurrence the hoisted name replaces */
ESMLiveExportDependency.REFERENCE = 0;
/** A shorthand property, which keeps its key */
ESMLiveExportDependency.SHORTHAND = 1;
/** An anonymous function or class the binding names */
ESMLiveExportDependency.NAMED = 2;

/** @type {Set<keyof DependencyKinds>} */
ESMLiveExportDependency.KINDS = new Set([
	...NullDependency.KINDS,
	"esm-live-export"
]);

module.exports = ESMLiveExportDependency;
