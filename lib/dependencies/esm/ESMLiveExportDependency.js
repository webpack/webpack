/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RuntimeGlobals = require("../../runtime/RuntimeGlobals");
const makeSerializable = require("../../util/makeSerializable");
const { propertyAccess } = require("../../util/property");
const { getRuntimeKey } = require("../../util/runtime");
const NullDependency = require("../core/NullDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import Dependency, { DependencyKinds, UpdateHashContext } from "../../graph/Dependency" */
/** @import ModuleGraph, { LiveBinding } from "../../graph/ModuleGraph" */
/** @import Module from "../../module/Module" */
/** @import { DependencyTemplateContext } from "../../template/DependencyTemplate" */
/** @import Hash from "../../util/Hash" */
/** @import { RuntimeSpec } from "../../util/runtime" */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<[string[], number[], boolean, boolean]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<[string[], number[], boolean, boolean]>} ObjectSerializerContext */

/**
 * A module-level binding a module library may declare in the chunk's scope under a
 * reserved name, so the library exports the binding itself; it holds every reference,
 * or, in a hot module, every write the module mirrors there through a setter.
 */
class ESMLiveExportDependency extends NullDependency {
	/**
	 * Creates an instance of ESMLiveExportDependency.
	 * @param {string[]} names every name the declaration declares
	 * @param {number[]} occurrences flat triples of start, end and `name index * KINDS_PER_NAME + kind`, a kind from {@link ESMLiveExportDependency.REFERENCE}
	 * @param {boolean} readByEval whether the module calls `eval`, which reads the names as written
	 * @param {boolean} writeThrough whether the module keeps its declarations and mirrors each write, as a hot update replaces it
	 */
	constructor(names, occurrences, readByEval, writeThrough) {
		super();
		this.names = names;
		this.occurrences = occurrences;
		this.readByEval = readByEval;
		this.writeThrough = writeThrough;
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
		const bindings =
			meta && (this.writeThrough ? meta.liveSetters : meta.liveBindings);
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
		context
			.write(this.names)
			.write(this.occurrences)
			.write(this.readByEval)
			.write(this.writeThrough);
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
		const c3 = c2.rest;
		this.writeThrough = c3.read();
		super.deserialize(c3.rest);
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
	apply(
		dependency,
		source,
		{ moduleGraph, chunkGraph, module, runtime, runtimeRequirements }
	) {
		const dep = /** @type {ESMLiveExportDependency} */ (dependency);
		const hoisted = dep.getHoistedNames(moduleGraph, runtime);
		if (hoisted === undefined) return;
		const { occurrences, names } = dep;
		const kinds = ESMLiveExportDependency.KINDS_PER_NAME;
		if (dep.writeThrough) {
			runtimeRequirements.add(RuntimeGlobals.require);
			const id = JSON.stringify(chunkGraph.getModuleId(module));
			/** @type {string[]} */
			const helpers = [];
			for (const name of names) {
				const helper = `__webpack_live_sync_${name}__`;
				helpers.push(helper);
				// Hoisted, so any write may call it; a value passed with `v` set is what
				// the binding is about to hold, read before the binding is initialized.
				source.insert(
					0,
					`function ${helper}(r, v) {\n` +
						`\tvar s = ${RuntimeGlobals.liveExportSetters};\n` +
						`\ts = s && s[${id}];\n` +
						`\ts = s && s${propertyAccess([name])};\n` +
						`\tif (s) for (var i = 0; i < s.length; i++) s[i](v ? r : ${name});\n` +
						"\treturn r;\n}\n"
				);
			}
			for (let i = 0; i < occurrences.length; i += 3) {
				const start = occurrences[i];
				const end = occurrences[i + 1];
				const helper = helpers[Math.floor(occurrences[i + 2] / kinds)];
				switch (occurrences[i + 2] % kinds) {
					case ESMLiveExportDependency.SYNC:
						source.insert(start, `${helper}(`);
						source.insert(end, ")");
						break;
					case ESMLiveExportDependency.VALUE:
						source.insert(start, `${helper}(`);
						source.insert(end, ", 1)");
						break;
					case ESMLiveExportDependency.NAMED_VALUE: {
						// A property key gives the function or class the name the binding did
						const name = names[Math.floor(occurrences[i + 2] / kinds)];
						source.insert(start, `${helper}({ ${name}: `);
						source.insert(end, ` }.${name}, 1)`);
						break;
					}
					case ESMLiveExportDependency.UNDEFINED:
						source.insert(start, ` = ${helper}(void 0, 1)`);
						break;
					case ESMLiveExportDependency.STATEMENT:
						source.insert(start, `;${helper}();\n`);
						break;
					case ESMLiveExportDependency.DECLARATOR:
						source.insert(start, `, __webpack_live_synced__ = ${helper}()`);
						break;
					default:
						source.insert(start, `{;${helper}();`);
						source.insert(end, "}");
				}
			}
			return;
		}
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
				case ESMLiveExportDependency.NAMED:
					// A property key gives the function or class the name the binding did
					source.insert(start, `{ ${names[index]}: `);
					source.insert(end, ` }.${names[index]}`);
					break;
				case ESMLiveExportDependency.PARENTHESIZED:
					source.insert(start, "(");
					source.insert(end, ")");
					break;
				default:
					source.insert(start, `\n${hoisted[index]} = ${names[index]};\n`);
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
/** A destructuring declarator that, without its keyword, needs parentheses */
ESMLiveExportDependency.PARENTHESIZED = 4;
/** Where a function or class declaration, which stays, sets the binding */
ESMLiveExportDependency.INITIALIZE = 5;
/** A write a hot module mirrors once it ran, wrapped in the name's sync call */
ESMLiveExportDependency.SYNC = 6;
/** A declarator's initializer, mirrored as the value the binding takes */
ESMLiveExportDependency.VALUE = 7;
/** An anonymous function or class initializer, mirrored under the name it takes */
ESMLiveExportDependency.NAMED_VALUE = 8;
/** A declarator without an initializer, mirrored as `undefined` */
ESMLiveExportDependency.UNDEFINED = 9;
/** Where a statement mirrors the binding, after a declaration or a loop's next value */
ESMLiveExportDependency.STATEMENT = 10;
/** A loop body that is not a block, wrapped in one mirroring the loop's next value */
ESMLiveExportDependency.BODY = 11;
/** The end of a loop's `var` head, where a declarator mirrors what a pattern took */
ESMLiveExportDependency.DECLARATOR = 12;
/** How many kinds an occurrence's third number tells apart per name */
ESMLiveExportDependency.KINDS_PER_NAME = 13;

/** @type {Set<keyof DependencyKinds>} */
ESMLiveExportDependency.KINDS = new Set([
	...NullDependency.KINDS,
	"esm-live-export"
]);

module.exports = ESMLiveExportDependency;
