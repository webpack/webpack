import "./shared.js";

it("should update the runtime chunk filename map on rebuild", () => {
	const currentChunkFile = Array.isArray(STATS_JSON.assetsByChunkName.js)
		? STATS_JSON.assetsByChunkName.js[0]
		: STATS_JSON.assetsByChunkName.js;
	const serviceWorkerSource = readOutputFile("service-worker.js");

	expect(currentChunkFile).toBeTruthy();

	if (WATCH_STEP === "0") {
		STATE.previousChunkFile = currentChunkFile;
	} else {
		expect(currentChunkFile).not.toBe(STATE.previousChunkFile);
	}

	// We need this emitted-source assertion because an incorrect hash order may
	// still produce a new build, but a wrong one. Check the emitted source to
	// ensure the new chunk filename is actually referenced by service-worker.js.
	expect(serviceWorkerSource).toContain(currentChunkFile);
});
