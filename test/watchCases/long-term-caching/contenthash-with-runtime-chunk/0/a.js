import { sharedValue } from "./large-shared";

it("should compile without errors", () => {
	expect(STATS_JSON.errors).toHaveLength(0);
});

it("should have the shared value", () => {
	const expected =
		WATCH_STEP === "0" ? "__SHARED__" : "__SHARED_CHANGED__";
	expect(sharedValue).toBe(expected);
});

it("should update split chunk content hash on rebuild", () => {
	// The unnamed split chunk carrying large-shared.js
	const splitAsset = STATS_JSON.assets.find(
		a => !a.chunkNames.length && a.name.endsWith(".js")
	);
	expect(splitAsset).toBeTruthy();
	if (WATCH_STEP === "0") {
		STATE.splitChunkFile = splitAsset.name;
	} else {
		// large-shared.js changed, so its content hash must differ from step 0.
		// With the buggy hashing order the runtime embeds the stale step-0 hash
		// and the split chunk file referenced at runtime does not exist.
		expect(splitAsset.name).not.toBe(STATE.splitChunkFile);
	}
});
