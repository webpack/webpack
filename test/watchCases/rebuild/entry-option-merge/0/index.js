import "./changing";

it("should keep entry options contributed by later addEntry calls", () => {
	const assets = STATS_JSON.assets.map((a) => a.name);
	expect(assets).toContain("rt.js");
});
