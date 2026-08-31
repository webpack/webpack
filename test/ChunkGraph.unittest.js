"use strict";

const Chunk = require("../lib/Chunk");
const ChunkGraph = require("../lib/ChunkGraph");
const Entrypoint = require("../lib/Entrypoint");
const ModuleGraph = require("../lib/ModuleGraph");

describe("ChunkGraph", () => {
	it("visits shared dependent entrypoints only once", () => {
		const chunkGraph = new ChunkGraph(new ModuleGraph());
		const rootChunk = new Chunk("root", false);
		const root = new Entrypoint("root");
		root.setEntrypointChunk(rootChunk);
		root.pushChunk(rootChunk);
		rootChunk.addGroup(root);

		const left = new Entrypoint("left");
		const right = new Entrypoint("right");
		const shared = new Entrypoint("shared");
		for (const entrypoint of [left, right, shared]) {
			const chunk = new Chunk(entrypoint.name, false);
			entrypoint.setEntrypointChunk(chunk);
			entrypoint.pushChunk(chunk);
		}

		root.addChild(left);
		left.addDependOn(root);
		root.addChild(right);
		right.addDependOn(root);
		left.addChild(shared);
		shared.addDependOn(left);
		right.addChild(shared);
		shared.addDependOn(right);

		let sharedVisits = 0;
		Object.defineProperty(shared, "childrenIterable", {
			get() {
				sharedVisits++;
				return [];
			}
		});

		chunkGraph.getRuntimeChunkDependentChunksIterable(rootChunk);
		expect(sharedVisits).toBe(1);
	});
});
