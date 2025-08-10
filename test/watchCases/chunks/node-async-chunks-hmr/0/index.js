import { react } from "./react";

it("should work where an ESM entryChunk depends on the runtimeChunk", async function (done) {
	const mainChunk = STATS_JSON.chunks.find((chunk) => chunk.id === "main");
	const runtimeChunk = STATS_JSON.chunks.find((chunk) => chunk.id === "runtime-main");
	const dynamic1Chunk = STATS_JSON.chunks.find((chunk) => chunk.id === "dynamic-1_js");
	const dynamic2Chunk = STATS_JSON.chunks.find((chunk) => chunk.id === "dynamic-2_js");
	const reactChunk = STATS_JSON.chunks.find((chunk) => chunk.id === "react");
	expect(mainChunk).toBeDefined();
	expect(react).toBe("react");

	await import('./dynamic-1').then(console.log)
	await import('./dynamic-2').then(console.log)

	if (WATCH_STEP === "0") {
		STATE.mainChunkHash = mainChunk.hash;
		STATE.dynamic1ChunkHash = dynamic1Chunk.hash;
		STATE.dynamic2ChunkHash = dynamic2Chunk.hash;
		STATE.runtimeChunkHash = runtimeChunk.hash;
		STATE.reactChunkHash = reactChunk.hash;
	} else {
		// async dynamic2Chunk needn't be updated
		expect(dynamic2Chunk.hash).toBe(STATE.dynamic2ChunkHash);
		// initial reactChunk is needn't be updated
		expect(reactChunk.hash).toBe(STATE.reactChunkHash);


		// initial mainChunk need to be updated
		expect(mainChunk.hash).not.toBe(STATE.mainChunkHash);
		// async dynamic1Chunk need to be updated
		expect(dynamic1Chunk.hash).not.toBe(STATE.dynamic1ChunkHash);
		// runtime runtimeChunk need to be updated
		expect(runtimeChunk.hash).not.toBe(STATE.runtimeChunkHash);
	}
	done()
});
