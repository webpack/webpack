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

// ReplaceSource sorts fractional positions before flooring them to source offsets.
// Value wrappers open before sync calls and close after them; statement inserts
// and body closures follow both.
const SYNC_START_OFFSET = 0.5;
const VALUE_END_OFFSET = 0.5;
const AFTER_VALUE_OFFSET = 0.75;

/** @import { ReplaceSource } from "webpack-sources" */
/** @import Dependency, { DependencyKinds, UpdateHashContext } from "../../graph/Dependency" */
/** @import ModuleGraph, { LiveBinding } from "../../graph/ModuleGraph" */
/** @import Module from "../../module/Module" */
/** @import { DependencyTemplateContext } from "../../template/DependencyTemplate" */
/** @import Hash from "../../util/Hash" */
/** @import { RuntimeSpec } from "../../util/runtime" */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<[string[], number[], number[], boolean, boolean, boolean]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<[string[], number[], number[], boolean, boolean, boolean]>} ObjectSerializerContext */

/**
 * The names the chunk's scope declares for a declaration, and how the module keeps them.
 * @typedef {object} HoistedNames
 * @property {string[]} names the declared name of each name
 * @property {boolean} mirrored whether the module keeps its declaration and mirrors each write
 * @property {boolean} registered whether it mirrors them through the setters a module library registers
 */

/**
 * A module-level binding a module library may declare in the chunk's scope under a
 * reserved name, so the library exports the binding itself; it holds every reference,
 * and every write a module keeping its declaration mirrors there instead.
 */
class ESMLiveExportDependency extends NullDependency {
	/**
	 * Creates an instance of ESMLiveExportDependency.
	 * @param {string[]} names every name the declaration declares
	 * @param {number[]} occurrences flat triples of start, end and `name index * KINDS_PER_NAME + kind` renaming takes, a kind from {@link ESMLiveExportDependency.REFERENCE}
	 * @param {number[]} mirrors the same triples for where a module keeping its declaration mirrors a write, a kind from {@link ESMLiveExportDependency.SYNC}
	 * @param {boolean} readByEval whether the module calls `eval`, which reads the names as written
	 * @param {boolean} hot whether a hot update replaces the module, which then only mirrors, as renaming cannot reach it
	 * @param {boolean} earlyUse whether the module uses a `let` or class above its declaration, where only its own declaration throws
	 */
	constructor(names, occurrences, mirrors, readByEval, hot, earlyUse) {
		super();
		this.names = names;
		this.occurrences = occurrences;
		this.mirrors = mirrors;
		this.readByEval = readByEval;
		this.hot = hot;
		this.earlyUse = earlyUse;
	}

	get type() {
		return "harmony live export";
	}

	/**
	 * Returns the names the chunk's scope declares for this runtime, if it does.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {RuntimeSpec} runtime the runtime the module is generated for
	 * @returns {HoistedNames | undefined} the names and how the module keeps them
	 */
	getHoistedNames(moduleGraph, runtime) {
		const meta = moduleGraph.getMetaIfExisting(
			/** @type {Module} */ (moduleGraph.getParentModule(this))
		);
		if (meta === undefined) return;
		const runtimeKey = getRuntimeKey(runtime);
		for (const bindings of [meta.liveSetters, meta.liveBindings]) {
			if (bindings === undefined) continue;
			const first = bindings.get(this.names[0]);
			if (first === undefined || !first.runtimes.has(runtimeKey)) continue;
			return {
				names: this.names.map(
					(name) => /** @type {LiveBinding} */ (bindings.get(name)).name
				),
				mirrored: bindings === meta.liveSetters,
				registered: first.registered.has(runtimeKey)
			};
		}
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
		if (hoisted === undefined) return;
		hash.update(
			`${hoisted.names.join()}|${hoisted.mirrored}|${hoisted.registered}`
		);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this.names)
			.write(this.occurrences)
			.write(this.mirrors)
			.write(this.readByEval)
			.write(this.hot)
			.write(this.earlyUse);
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
		this.mirrors = c2.read();
		const c3 = c2.rest;
		this.readByEval = c3.read();
		const c4 = c3.rest;
		this.hot = c4.read();
		const c5 = c4.rest;
		this.earlyUse = c5.read();
		super.deserialize(c5.rest);
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
		const { occurrences, mirrors, names } = dep;
		const kinds = ESMLiveExportDependency.KINDS_PER_NAME;
		if (hoisted.mirrored) {
			const id = hoisted.registered
				? JSON.stringify(chunkGraph.getModuleId(module))
				: "";
			if (hoisted.registered) runtimeRequirements.add(RuntimeGlobals.require);
			/** @type {string[]} */
			const helpers = [];
			for (let index = 0; index < names.length; index++) {
				const name = names[index];
				const helper = `__webpack_live_sync_${name}__`;
				helpers.push(helper);
				// Hoisted, so any write may call it; a value passed with `v` set is what
				// the binding is about to hold, read before the binding is initialized.
				const sync = hoisted.registered
					? `\tvar s = ${RuntimeGlobals.liveExportSetters};\n` +
						`\ts = s && s[${id}];\n` +
						`\ts = s && s${propertyAccess([name])};\n` +
						`\tif (s) for (var i = 0; i < s.length; i++) s[i](v ? r : ${name});\n`
					: `\t${hoisted.names[index]} = v ? r : ${name};\n`;
				source.insert(
					0,
					`function ${helper}(r, v) {\n${
						// an eval() call may come before the binding is initialized
						dep.readByEval
							? `\ttry {\n\t${sync.replace(/\n\t/g, "\n\t\t")}\t} catch (e) {}\n`
							: sync
					}\treturn r;\n}\n`
				);
			}
			for (let i = 0; i < mirrors.length; i += 3) {
				const start = mirrors[i];
				const end = mirrors[i + 1];
				const helper = helpers[Math.floor(mirrors[i + 2] / kinds)];
				switch (mirrors[i + 2] % kinds) {
					case ESMLiveExportDependency.SYNC:
						source.insert(start + SYNC_START_OFFSET, `${helper}(`);
						source.insert(end, ")");
						break;
					case ESMLiveExportDependency.VALUE:
						source.insert(start, `${helper}((`);
						source.insert(end + VALUE_END_OFFSET, "), 1)");
						break;
					case ESMLiveExportDependency.NAMED_VALUE: {
						// A property key gives the function or class the name the binding did
						const name = names[Math.floor(mirrors[i + 2] / kinds)];
						source.insert(start, `${helper}({ ${name}: `);
						source.insert(end + VALUE_END_OFFSET, ` }.${name}, 1)`);
						break;
					}
					case ESMLiveExportDependency.UNDEFINED:
						source.insert(start, ` = ${helper}(void 0, 1)`);
						break;
					case ESMLiveExportDependency.STATEMENT:
						source.insert(start + AFTER_VALUE_OFFSET, `;${helper}();\n`);
						break;
					case ESMLiveExportDependency.DECLARATOR:
						source.insert(
							start + AFTER_VALUE_OFFSET,
							`, __webpack_live_synced__ = ${helper}()`
						);
						break;
					default:
						source.insert(start, `{;${helper}();`);
						source.insert(end + AFTER_VALUE_OFFSET, "}");
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
					source.replace(start, end - 1, hoisted.names[index]);
					break;
				case ESMLiveExportDependency.SHORTHAND:
					source.replace(
						start,
						end - 1,
						`${names[index]}: ${hoisted.names[index]}`
					);
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
					source.insert(
						start,
						`\n${hoisted.names[index]} = ${names[index]};\n`
					);
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
