"use strict";

const Chunk = require("../lib/Chunk");
const ChunkGraph = require("../lib/ChunkGraph");
const Entrypoint = require("../lib/Entrypoint");
const ModuleGraph = require("../lib/ModuleGraph");

/**
 * @param {string} name entrypoint name
 * @param {boolean=} hasRuntime whether the entrypoint chunk carries a runtime
 * @returns {Entrypoint} entrypoint with its own entrypoint chunk
 */
const createEntrypoint = (name, hasRuntime) => {
	const entrypoint = new Entrypoint(name);
	const chunk = new Chunk(name, false);
	if (hasRuntime) chunk.runtime = name;
	entrypoint.setEntrypointChunk(chunk);
	entrypoint.pushChunk(chunk);
	chunk.addGroup(entrypoint);
	return entrypoint;
};

/**
 * @param {Entrypoint} parent depended-on entrypoint
 * @param {Entrypoint} child dependent entrypoint
 * @returns {void}
 */
const dependOn = (parent, child) => {
	parent.addChild(child);
	child.addDependOn(parent);
};

/**
 * Counts how often the traversal reads an entrypoint's children.
 * @param {Entrypoint} entrypoint entrypoint to observe
 * @returns {{ get count(): number }} visit counter
 */
const countVisits = (entrypoint) => {
	let count = 0;
	const children = [...entrypoint.childrenIterable];
	Object.defineProperty(entrypoint, "childrenIterable", {
		get() {
			count++;
			return children;
		}
	});
	return {
		get count() {
			return count;
		}
	};
};

describe("ChunkGraph", () => {
	describe("getRuntimeChunkDependentChunksIterable", () => {
		it("visits a shared dependent entrypoint only once", () => {
			const chunkGraph = new ChunkGraph(new ModuleGraph());
			const root = createEntrypoint("root", true);
			const left = createEntrypoint("left");
			const right = createEntrypoint("right");
			const shared = createEntrypoint("shared");

			dependOn(root, left);
			dependOn(root, right);
			dependOn(left, shared);
			dependOn(right, shared);

			const visits = countVisits(shared);

			chunkGraph.getRuntimeChunkDependentChunksIterable(
				root.getEntrypointChunk()
			);

			expect(visits.count).toBe(1);
		});

		it("visits each entrypoint of a diamond chain once", () => {
			const chunkGraph = new ChunkGraph(new ModuleGraph());
			const root = createEntrypoint("root", true);
			// without deduplication every diamond doubles the work, so a chain of
			// `depth` diamonds costs 2 ** depth visits of the final entrypoint
			const depth = 8;
			let current = root;
			/** @type {Entrypoint[]} */
			const joins = [];
			for (let i = 0; i < depth; i++) {
				const left = createEntrypoint(`left${i}`);
				const right = createEntrypoint(`right${i}`);
				const join = createEntrypoint(`join${i}`);
				dependOn(current, left);
				dependOn(current, right);
				dependOn(left, join);
				dependOn(right, join);
				joins.push(join);
				current = join;
			}

			const visits = joins.map((join) => countVisits(join));

			chunkGraph.getRuntimeChunkDependentChunksIterable(
				root.getEntrypointChunk()
			);

			expect(visits.map((visit) => visit.count)).toEqual(
				Array.from({ length: depth }).fill(1)
			);
		});

		it("returns the dependent chunks of every reachable entrypoint", () => {
			const chunkGraph = new ChunkGraph(new ModuleGraph());
			const root = createEntrypoint("root", true);
			const left = createEntrypoint("left");
			const right = createEntrypoint("right");
			const shared = createEntrypoint("shared");

			dependOn(root, left);
			dependOn(root, right);
			dependOn(left, shared);
			dependOn(right, shared);

			const result = [
				...chunkGraph.getRuntimeChunkDependentChunksIterable(
					root.getEntrypointChunk()
				)
			];

			// every entrypoint that has a dependent entrypoint contributes its own
			// chunk, except the runtime chunk the traversal started from
			expect(new Set(result)).toEqual(
				new Set([left.getEntrypointChunk(), right.getEntrypointChunk()])
			);
		});

		it("terminates on a circular dependOn relation", () => {
			const chunkGraph = new ChunkGraph(new ModuleGraph());
			const root = createEntrypoint("root", true);
			const a = createEntrypoint("a");
			const b = createEntrypoint("b");

			dependOn(root, a);
			dependOn(a, b);
			dependOn(b, a);

			const result = [
				...chunkGraph.getRuntimeChunkDependentChunksIterable(
					root.getEntrypointChunk()
				)
			];

			expect(new Set(result)).toEqual(
				new Set([a.getEntrypointChunk(), b.getEntrypointChunk()])
			);
		});
	});
});
