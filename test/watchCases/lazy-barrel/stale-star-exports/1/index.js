import { local, b } from "./pkg";

// `b` comes through the previously deferred `export * from "./sub"`; pkg is
// restored from the FlagDependencyExportsPlugin cache by its unchanged hash, so
// it must be re-flagged to regain sub's exports (else `b` reads as not provided)
it("should provide a star re-export name newly imported on rebuild", () => {
	expect(local).toBe("local");
	expect(b).toBe("b");
	expect(
		STATS_JSON.modules.some((m) => m.name.endsWith("pkg/sub/index.js"))
	).toBe(true);
	expect(
		STATS_JSON.modules.some((m) => m.name.endsWith("pkg/sub2/index.js"))
	).toBe(false);
});
