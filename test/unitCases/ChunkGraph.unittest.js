"use strict";

const Chunk = require("../../lib/graph/Chunk");
const ChunkGraph = require("../../lib/graph/ChunkGraph");
const Entrypoint = require("../../lib/graph/Entrypoint");
const ModuleGraph = require("../../lib/graph/ModuleGraph");
const RawModule = require("../../lib/module/RawModule");

// The build-level behaviour lives in `configCases/runtime/depend-on-diamond-chain`.
// Only the visit counts are here: a real build can show the cost as elapsed time
// but cannot count how often the traversal reaches an entrypoint.

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

			const result = [
				...chunkGraph.getRuntimeChunkDependentChunksIterable(
					root.getEntrypointChunk()
				)
			];

			expect(visits.count).toBe(1);
			// deduplicating must not drop a chunk from the result
			expect(new Set(result)).toEqual(
				new Set([left.getEntrypointChunk(), right.getEntrypointChunk()])
			);
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
	});

	describe("a module in no chunk", () => {
		// Most modules are in none once concatenation has absorbed them, so the
		// chunk set is built only where a chunk is added. Every reader has to
		// answer without one.
		it("answers every accessor without a chunk set", () => {
			const chunkGraph = new ChunkGraph(new ModuleGraph());
			const module = new RawModule("", "no-chunk");
			expect(chunkGraph.getNumberOfModuleChunks(module)).toBe(0);
			expect([...chunkGraph.getModuleChunksIterable(module)]).toEqual([]);
			expect(chunkGraph.getModuleChunks(module)).toEqual([]);
			expect([
				...chunkGraph.getOrderedModuleChunksIterable(module, () => 0)
			]).toEqual([]);
			expect([...chunkGraph.getModuleRuntimes(module)]).toEqual([]);
			expect(chunkGraph.isModuleInChunk(module, new Chunk("a", false))).toBe(
				false
			);
		});

		it("refuses to have the shared answer modified", () => {
			const chunkGraph = new ChunkGraph(new ModuleGraph());
			const module = new RawModule("", "frozen");
			const chunks = /** @type {EXPECTED_ANY} */ (
				chunkGraph.getModuleChunksIterable(module)
			);
			// Every module in no chunk is answered with this one array, so a caller
			// ignoring "do not modify" must not be able to reach the others.
			expect(() => chunks.push(new Chunk("a", false))).toThrow();
		});

		it("takes its chunks back when disconnected", () => {
			const chunkGraph = new ChunkGraph(new ModuleGraph());
			const module = new RawModule("", "connected");
			const chunk = new Chunk("a", false);
			chunkGraph.connectChunkAndModule(chunk, module);
			expect(chunkGraph.getNumberOfModuleChunks(module)).toBe(1);
			expect(chunkGraph.getModuleChunks(module)).toEqual([chunk]);
			chunkGraph.disconnectChunkAndModule(chunk, module);
			expect(chunkGraph.getNumberOfModuleChunks(module)).toBe(0);
			expect(chunkGraph.getModuleChunks(module)).toEqual([]);
		});

		it("can be disconnected although it holds no chunk set", () => {
			const chunkGraph = new ChunkGraph(new ModuleGraph());
			const module = new RawModule("", "never-connected");
			const chunk = new Chunk("a", false);
			// Nothing to delete from, which must not throw.
			chunkGraph.disconnectChunkAndModule(chunk, module);
			expect(chunkGraph.getNumberOfModuleChunks(module)).toBe(0);
		});

		it("grows into a set once a second chunk contains it", () => {
			const chunkGraph = new ChunkGraph(new ModuleGraph());
			const module = new RawModule("", "two-chunks");
			const first = new Chunk("a", false);
			first.runtime = "a";
			const second = new Chunk("b", false);
			second.runtime = "b";
			chunkGraph.connectChunkAndModule(first, module);
			// Connecting the same chunk twice must not grow anything.
			chunkGraph.connectChunkAndModule(first, module);
			expect(chunkGraph.getNumberOfModuleChunks(module)).toBe(1);
			chunkGraph.connectChunkAndModule(second, module);
			expect(chunkGraph.getNumberOfModuleChunks(module)).toBe(2);
			expect(chunkGraph.getModuleChunks(module)).toEqual([first, second]);
			expect([...chunkGraph.getModuleRuntimes(module)].sort()).toEqual([
				"a",
				"b"
			]);
			// Losing one leaves the set, which is not shrunk back to an array.
			chunkGraph.disconnectChunkAndModule(second, module);
			expect(chunkGraph.getNumberOfModuleChunks(module)).toBe(1);
			expect(chunkGraph.getModuleChunks(module)).toEqual([first]);
			expect([...chunkGraph.getModuleRuntimes(module)]).toEqual(["a"]);
		});

		it("reads the runtime of the one chunk it is in", () => {
			const chunkGraph = new ChunkGraph(new ModuleGraph());
			const module = new RawModule("", "one-runtime");
			const chunk = new Chunk("a", false);
			chunk.runtime = "a";
			chunkGraph.connectChunkAndModule(chunk, module);
			expect([...chunkGraph.getModuleRuntimes(module)]).toEqual(["a"]);
			expect([...chunkGraph.getModuleChunksIterable(module)]).toEqual([chunk]);
			// This array is the membership itself, so modifying it would change the
			// graph without the chunk side hearing of it.
			expect(() =>
				/** @type {EXPECTED_ANY} */
				(chunkGraph.getModuleChunks(module)).push(new Chunk("b", false))
			).toThrow();
		});

		it("takes a third chunk into the set it already has", () => {
			const chunkGraph = new ChunkGraph(new ModuleGraph());
			const module = new RawModule("", "three-chunks");
			const chunks = ["a", "b", "c"].map((name) => {
				const chunk = new Chunk(name, false);
				chunk.runtime = name;
				return chunk;
			});
			for (const chunk of chunks) {
				chunkGraph.connectChunkAndModule(chunk, module);
			}
			expect(chunkGraph.getNumberOfModuleChunks(module)).toBe(3);
			expect([...chunkGraph.getModuleRuntimes(module)].sort()).toEqual([
				"a",
				"b",
				"c"
			]);
		});

		it("lets go of a chunk that disconnects every module at once", () => {
			const chunkGraph = new ChunkGraph(new ModuleGraph());
			const first = new RawModule("", "first");
			const second = new RawModule("", "second");
			const chunk = new Chunk("a", false);
			chunkGraph.connectChunkAndModule(chunk, first);
			chunkGraph.connectChunkAndModule(chunk, second);
			chunkGraph.disconnectChunk(chunk);
			expect(chunkGraph.getNumberOfModuleChunks(first)).toBe(0);
			expect(chunkGraph.getNumberOfModuleChunks(second)).toBe(0);
			expect(chunkGraph.getNumberOfChunkModules(chunk)).toBe(0);
		});

		it("keeps the one chunk it has when another disconnects", () => {
			const chunkGraph = new ChunkGraph(new ModuleGraph());
			const module = new RawModule("", "other-chunk");
			const held = new Chunk("a", false);
			const other = new Chunk("b", false);
			chunkGraph.connectChunkAndModule(held, module);
			// Nothing of this module's is in the other chunk, so nothing changes.
			chunkGraph.disconnectChunkAndModule(other, module);
			expect(chunkGraph.getModuleChunks(module)).toEqual([held]);
		});

		it("orders one chunk without asking the comparer", () => {
			const chunkGraph = new ChunkGraph(new ModuleGraph());
			const module = new RawModule("", "ordered-one");
			const chunk = new Chunk("a", false);
			chunkGraph.connectChunkAndModule(chunk, module);
			let asked = 0;
			const ordered = [
				...chunkGraph.getOrderedModuleChunksIterable(module, () => {
					asked++;
					return 0;
				})
			];
			expect(ordered).toEqual([chunk]);
			expect(asked).toBe(0);
		});

		it("orders the chunks of a module in several", () => {
			const chunkGraph = new ChunkGraph(new ModuleGraph());
			const module = new RawModule("", "ordered-many");
			const first = new Chunk("a", false);
			const second = new Chunk("b", false);
			chunkGraph.connectChunkAndModule(second, module);
			chunkGraph.connectChunkAndModule(first, module);
			const byName = [
				...chunkGraph.getOrderedModuleChunksIterable(module, (a, b) =>
					/** @type {string} */ (a.name) < /** @type {string} */ (b.name)
						? -1
						: /** @type {string} */ (a.name) > /** @type {string} */ (b.name)
							? 1
							: 0
				)
			];
			expect(byName).toEqual([first, second]);
		});

		it("moves a replaced module's chunks onto one holding no set", () => {
			const chunkGraph = new ChunkGraph(new ModuleGraph());
			const oldModule = new RawModule("", "old");
			const newModule = new RawModule("", "new");
			const chunk = new Chunk("a", false);
			chunkGraph.connectChunkAndModule(chunk, oldModule);
			chunkGraph.replaceModule(oldModule, newModule);
			expect(chunkGraph.getModuleChunks(newModule)).toEqual([chunk]);
			expect(chunkGraph.getNumberOfModuleChunks(oldModule)).toBe(0);
			expect(chunkGraph.isModuleInChunk(newModule, chunk)).toBe(true);
		});

		it("replaces a module that is in no chunk", () => {
			const chunkGraph = new ChunkGraph(new ModuleGraph());
			const oldModule = new RawModule("", "old-loose");
			const newModule = new RawModule("", "new-loose");
			chunkGraph.replaceModule(oldModule, newModule);
			expect(chunkGraph.getNumberOfModuleChunks(newModule)).toBe(0);
		});
	});
});
