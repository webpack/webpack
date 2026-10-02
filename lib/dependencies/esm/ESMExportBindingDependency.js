/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sebastian Beltran @bjohansebas
*/

"use strict";

const RuntimeGlobals = require("../../runtime/RuntimeGlobals");
const makeSerializable = require("../../util/makeSerializable");
const NullDependency = require("../core/NullDependency");

/** @import { Range } from "../../javascript/JavascriptParser" */
/** @import { ModuleId } from "../../graph/ChunkGraph" */
/** @import Dependency, { UpdateHashContext } from "../../graph/Dependency" */
/** @import Hash from "../../util/Hash" */
/** @import { ReplaceSource } from "webpack-sources" */
/** @import { DependencyTemplateContext } from "../../template/DependencyTemplate" */
/** @typedef {{ id: string, names: string[], range: Range, kind: "expression" | "postfix" | "pattern", shorthand: boolean, defaultRange?: Range, originalName?: string }} BindingWrite */
/** @typedef {{ id: ModuleId | null, name: string }} ExportBinding */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<[BindingWrite[]]>} ObjectSerializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<[BindingWrite[]]>} ObjectDeserializerContext */

class ESMExportBindingDependency extends NullDependency {
	/** @param {BindingWrite[]} writes writes */
	constructor(writes) {
		super();
		this.writes = writes;
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, { chunkGraph }) {
		const { moduleGraph } = chunkGraph;
		const module = moduleGraph.getParentModule(this);
		const meta = module && moduleGraph.getMetaIfExisting(module);
		const bindings = meta && meta.libraryExportBindings;
		if (!bindings) {
			hash.update("no export bindings");
			return;
		}
		for (const [name, binding] of bindings) {
			hash.update(`${name}:${JSON.stringify(binding)}`);
		}
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.writes);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.writes = context.read();
		super.deserialize(context.rest);
	}
}
makeSerializable(
	ESMExportBindingDependency,
	"webpack/lib/dependencies/esm/ESMExportBindingDependency"
);

ESMExportBindingDependency.Template = class extends NullDependency.Template {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { module, moduleGraph, runtimeRequirements }) {
		const meta = module && moduleGraph.getMetaIfExisting(module);
		const bindings = meta && meta.libraryExportBindings;
		if (!bindings) return;
		const dep = /** @type {ESMExportBindingDependency} */ (dependency);
		/** @type {Map<number, string[]>} */
		const endings = new Map();
		/**
		 * @param {number} position end
		 * @param {string} text suffix
		 * @returns {void}
		 */
		const end = (position, text) => {
			const existing = endings.get(position);
			if (existing) existing.unshift(text);
			else endings.set(position, [text]);
		};
		// Visit outer writes first so shared end positions close the inner one first.
		for (const write of dep.writes) {
			const binding = bindings.get(write.id);
			if (!binding) continue;
			runtimeRequirements.add(RuntimeGlobals.exportBinding);
			runtimeRequirements.add(RuntimeGlobals.requireScope);
			const call = `${RuntimeGlobals.exportBinding}(${JSON.stringify(binding.id)}, ${JSON.stringify(binding.name)}, `;
			if (write.kind !== "pattern") {
				source.insert(write.range[0], call);
				end(
					write.range[1],
					write.kind === "postfix" ? `, false, ${write.id})` : ")"
				);
				continue;
			}
			const value =
				write.id === "__webpack_value__"
					? "__webpack_value_1__"
					: "__webpack_value__";
			source.replace(
				write.range[0],
				write.range[1] - 1,
				`${write.shorthand ? `${write.originalName || write.id}: ` : ""}({ set value(${value}) { ${write.id} = ${value}; ${call}${value}); } }).value`
			);
			if (write.defaultRange) {
				const key = JSON.stringify(write.originalName || write.id);
				source.insert(
					write.defaultRange[0],
					`({${(write.originalName || write.id) === "__proto__" ? `[${key}]` : key}: `
				);
				end(write.defaultRange[1], `})[${key}]`);
			}
		}
		for (const [position, parts] of endings) {
			source.insert(position, parts.join(""));
		}
	}
};

module.exports = ESMExportBindingDependency;
