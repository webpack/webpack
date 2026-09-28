const fs = require("fs");

const isUpdate = (name) => name.endsWith(".hot-update.json");

it("should rebuild on a module change", () => {
	expect(require("./changing-module")).toBe(WATCH_STEP);
});

it("should keep the last update until a newer one is emitted", () => {
	const emitted = STATS_JSON.assets
		.map((asset) => asset.name)
		.filter(isUpdate);
	const older = fs
		.readdirSync(STATS_JSON.outputPath)
		.filter((name) => isUpdate(name) && !emitted.includes(name));
	expect(emitted).toHaveLength(WATCH_STEP === "0" ? 0 : 1);
	// step 3 starts more than 10 seconds after step 2 emitted its update,
	// which a client may still be about to request, so it has to be there
	expect(older).toHaveLength(WATCH_STEP === "0" || WATCH_STEP === "1" ? 0 : 1);
});

if (WATCH_STEP === "2") {
	it("should wait past the hot update retention window", (done) => {
		setTimeout(done, 10100);
	}, 15000);
}
