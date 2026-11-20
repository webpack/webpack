/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const InitFragment = require("../template/InitFragment");
const makeSerializable = require("../util/makeSerializable");
const getChunkImportPath = require("./getChunkImportPath");

/** @import Chunk, { ChunkId } from "../graph/Chunk" */
/** @import Compilation from "../Compilation" */
/** @import { Source } from "webpack-sources" */
/**
 * @import {
 * 	ChunkRenderContext,
 * 	ChunkRenderContext as GenerateContext
 * } from "../javascript/JavascriptModulesPlugin"
 */
/** @import { ObjectDeserializerContext, ObjectSerializerContext } from "../serialization/ObjectMiddleware" */

/** @type {WeakMap<Compilation, Map<ChunkId, Chunk>>} */
const chunksByIdCache = new WeakMap();

/**
 * Returns the compilation's chunk with the given id.
 * @param {Compilation} compilation the compilation
 * @param {ChunkId} chunkId the chunk id
 * @returns {Chunk | undefined} the chunk
 */
const getChunkById = (compilation, chunkId) => {
	let chunksById = chunksByIdCache.get(compilation);
	if (chunksById === undefined) {
		chunksById = new Map();
		for (const chunk of compilation.chunks) {
			if (chunk.id !== null) chunksById.set(chunk.id, chunk);
		}
		chunksByIdCache.set(compilation, chunksById);
	}
	return chunksById.get(chunkId);
};

/**
 * A chunk-level `import { ... } from "<chunk>"` of the bindings a linked scope exports;
 * fragments for the same chunk merge into one statement.
 * @extends {InitFragment<ChunkRenderContext>}
 */
class LinkedImportInitFragment extends InitFragment {
	/**
	 * Creates an instance of LinkedImportInitFragment.
	 * @param {ChunkId} chunkId the id of the chunk whose top-level scope exports the bindings
	 * @param {Map<string, string>} bindings the exported name of each imported local name
	 */
	constructor(chunkId, bindings) {
		super(
			undefined,
			InitFragment.STAGE_ESM_IMPORTS,
			0,
			`linked chunk import ${chunkId}`
		);
		/** @type {ChunkId} */
		this.chunkId = chunkId;
		/** @type {Map<string, string>} */
		this.bindings = bindings;
	}

	/**
	 * Returns a fragment importing the names of both fragments; neither is mutated, as code generation results are cached.
	 * @param {LinkedImportInitFragment} other a fragment for the same chunk
	 * @returns {LinkedImportInitFragment} the merged fragment
	 */
	merge(other) {
		const bindings = new Map(other.bindings);
		for (const [local, exported] of this.bindings) {
			bindings.set(local, exported);
		}
		return new LinkedImportInitFragment(this.chunkId, bindings);
	}

	/**
	 * Returns the source code that will be included as initialization code.
	 * @param {GenerateContext} context context
	 * @returns {string | Source | undefined} the source code that will be included as initialization code
	 */
	getContent(context) {
		const { compilation } = context.runtimeTemplate;
		const chunk = /** @type {Chunk} */ (
			getChunkById(compilation, this.chunkId)
		);
		const specifiers = [...this.bindings]
			.sort(([a], [b]) => (a < b ? -1 : 1))
			.map(([local, exported]) => `${exported} as ${local}`);
		return `import { ${specifiers.join(", ")} } from ${JSON.stringify(
			getChunkImportPath(compilation, chunk, context.chunk)
		)};\n`;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.chunkId);
		write(this.bindings);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext<[ChunkId, Map<string, string>]>} context context
	 * @returns {LinkedImportInitFragment} the fragment
	 */
	static deserialize(context) {
		return new LinkedImportInitFragment(context.read(), context.rest.read());
	}
}

makeSerializable(
	LinkedImportInitFragment,
	"webpack/lib/esm/LinkedImportInitFragment"
);

module.exports = LinkedImportInitFragment;
