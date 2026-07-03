import { local, b } from "./pkg";

// `b` comes through the previously deferred `export * from "./sub"`; sub already
// existed unchanged, so the affected-modules propagation never resets the
// barrel's mem cache — it must still not restore the stale provided exports
// cached without sub's names
it("should provide a star re-export name newly imported on rebuild", () => {
	expect(local).toBe("local");
	expect(b).toBe("b");
});
