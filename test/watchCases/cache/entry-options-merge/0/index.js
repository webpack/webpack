it("should merge options from every entry on rebuilds", () => {
	expect(require("./tick.js")).toBe(WATCH_STEP);
	expect(STATS_JSON.assets.map((asset) => asset.name)).toEqual(["custom.js"]);
});
