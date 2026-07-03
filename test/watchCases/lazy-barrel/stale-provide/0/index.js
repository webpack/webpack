import { local, bProvided } from "./pkg";

// only the local export is used, so `export * from "./sub"` stays deferred and
// pkg gets cached without sub's exports
it("should not provide the unused star re-export name initially", () => {
	expect(local).toBe("local");
	expect(bProvided).not.toBe(true);
	expect(
		STATS_JSON.modules.some((m) => m.name.endsWith("pkg/sub/index.js"))
	).toBe(false);
});
