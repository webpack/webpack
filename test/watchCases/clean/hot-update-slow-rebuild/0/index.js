const fs = require("fs");

const isUpdate = (name) => /\.hot-update\.js(on)?$/.test(name);

it("should rebuild on a module change", () => {
	expect(require("./changing-module")).toBe(WATCH_STEP);
});

it("should keep the last update until a newer one is emitted", () => {
	const emitted = STATS_JSON.assets
		.map((asset) => asset.name)
		.filter(isUpdate);
	const previous = STATE.previousUpdates || [];
	const actual = fs.readdirSync(STATS_JSON.outputPath).filter(isUpdate);
	expect(emitted.some((name) => name.endsWith(".json"))).toBe(
		WATCH_STEP !== "0"
	);
	// step 3 starts more than 10 seconds after step 2 emitted its update,
	// which a client may still be about to request, so it has to be there
	expect(actual.sort()).toEqual([...emitted, ...previous].sort());
	STATE.previousUpdates = emitted;
});

if (WATCH_STEP === "2") {
	it("should wait past the hot update retention window", (done) => {
		setTimeout(done, 10100);
	}, 15000);
}
