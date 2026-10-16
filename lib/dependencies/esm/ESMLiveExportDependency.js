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
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<[string[], number[], boolean]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<[string[], number[], boolean]>} ObjectSerializerContext */

/**
 * A module-level `let` or `var` a module library may declare in the chunk's scope under a
 * reserved name, so the library exports the binding itself; it holds every reference.
 */
class ESMLiveExportDependency extends NullDependency {
	/**
	 * Creates an instance of ESMLiveExportDependency.
	 * @param {string[]} names every name the declaration declares
	 * @param {number[]} occurrences flat triples of start, end and `name index * KINDS_PER_NAME + kind`, a kind from {@link ESMLiveExportDependency.REFERENCE}
	 * @param {boolean} readByEval whether the module calls `eval`, which reads the names as written
	 */
	constructor(names, occurrences, readByEval) {
		super();
		this.names = names;
		this.occurrences = occurrences;
		this.readByEval = readByEval;
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
		context.write(this.names).write(this.occurrences).write(this.readByEval);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.names = context.read();
		const c1 = context.rest;
		this.occurrences = c1.read();
		const c2 = c1.rest;
		this.readByEval = c2.read();
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
		const { occurrences, names } = dep;
		const kinds = ESMLiveExportDependency.KINDS_PER_NAME;
		for (let i = 0; i < occurrences.length; i += 3) {
			const start = occurrences[i];
			const end = occurrences[i + 1];
			const index = Math.floor(occurrences[i + 2] / kinds);
			switch (occurrences[i + 2] % kinds) {
				case ESMLiveExportDependency.KEYWORD:
					source.replace(start, end - 1, "");
					break;
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
/** A declaration's `let` or `var`, dropped with the space up to its first name */
ESMLiveExportDependency.KEYWORD = 3;
/** How many kinds an occurrence's third number tells apart per name */
ESMLiveExportDependency.KINDS_PER_NAME = 4;

/** @type {Set<keyof DependencyKinds>} */
ESMLiveExportDependency.KINDS = new Set([
	...NullDependency.KINDS,
	"esm-live-export"
]);

module.exports = ESMLiveExportDependency;
