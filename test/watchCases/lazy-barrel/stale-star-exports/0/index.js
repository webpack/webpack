import { local } from "./pkg";

// only the local export is used, so `export * from "./sub"` stays deferred and
// pkg gets cached without sub's exports
it("should not build the unused star re-export target initially", () => {
	expect(local).toBe("local");
	expect(
		STATS_JSON.modules.some((m) => m.name.endsWith("pkg/sub/index.js"))
	).toBe(false);
});
