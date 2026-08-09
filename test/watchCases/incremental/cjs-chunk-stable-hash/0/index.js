import "./changing";

const promise = import("./cjs-chunk");

it("should keep the unchanged cjs chunk cached", () => {
	if (WATCH_STEP !== "0") {
		const asset = STATS_JSON.assets.find((a) => a.name.includes("cjs-chunk"));
		expect(asset.cached).toBe(true);
	}
	return promise;
});
