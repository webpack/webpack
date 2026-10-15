"use strict";

const Chunk = require("../../lib/graph/Chunk");
const ChunkGraph = require("../../lib/graph/ChunkGraph");
const ChunkGroup = require("../../lib/graph/ChunkGroup");
const Entrypoint = require("../../lib/graph/Entrypoint");
const ModuleGraph = require("../../lib/graph/ModuleGraph");
const RawModule = require("../../lib/module/RawModule");

// `Module.hasReasonForChunk` reaches these only from `Compilation.rebuildModule`
// after seal, which no build case drives with an existing chunk graph.

/**
 * @template {ChunkGroup} T
 * @param {T} group chunk group
 * @param {string} name chunk name
 * @returns {Chunk} the chunk now in the group
 */
const addChunk = (group, name) => {
	const chunk = new Chunk(name, false);
	group.pushChunk(chunk);
	chunk.addGroup(group);
	return chunk;
};

/**
 * @param {ChunkGroup} parent parent group
 * @param {ChunkGroup} child child group
 * @returns {void}
 */
const connect = (parent, child) => {
	parent.addChild(child);
	child.addParent(parent);
};

/**
 * Builds the chain entry → async → nested async with one chunk per group.
 * @returns {{ entryChunk: Chunk, asyncChunk: Chunk, nestedChunk: Chunk, nested: ChunkGroup }} the chain
 */
const createChain = () => {
	const entry = new Entrypoint("main");
	const entryChunk = addChunk(entry, "main");
	entry.setEntrypointChunk(entryChunk);
	const asyncGroup = new ChunkGroup("async");
	const asyncChunk = addChunk(asyncGroup, "async");
	const nested = new ChunkGroup("nested");
	const nestedChunk = addChunk(nested, "nested");
	connect(entry, asyncGroup);
	connect(asyncGroup, nested);
	return { entryChunk, asyncChunk, nestedChunk, nested };
};

describe("Module.isAccessibleInChunk", () => {
	it("is accessible when an ancestor group's chunk holds the module", () => {
		const { entryChunk, nested } = createChain();
		const chunkGraph = new ChunkGraph(new ModuleGraph());
		const module = new RawModule("", "m", "m");
		chunkGraph.connectChunkAndModule(entryChunk, module);

		expect(module.isAccessibleInChunkGroup(chunkGraph, nested)).toBe(true);
	});

	it("walks up to the initial group when no ancestor holds the module", () => {
		const { asyncChunk, nested } = createChain();
		const chunkGraph = new ChunkGraph(new ModuleGraph());
		const module = new RawModule("", "m", "m");
		chunkGraph.connectChunkAndModule(asyncChunk, new RawModule("", "o", "o"));

		expect(module.isAccessibleInChunkGroup(chunkGraph, nested)).toBe(false);
	});

	it("ignores the given chunk", () => {
		const { asyncChunk, nestedChunk } = createChain();
		const chunkGraph = new ChunkGraph(new ModuleGraph());
		const module = new RawModule("", "m", "m");
		chunkGraph.connectChunkAndModule(asyncChunk, module);

		expect(module.isAccessibleInChunk(chunkGraph, nestedChunk)).toBe(true);
		expect(module.isAccessibleInChunk(chunkGraph, nestedChunk, asyncChunk)).toBe(
			false
		);
	});
});
