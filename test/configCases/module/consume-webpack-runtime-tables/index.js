import value, { moduleIds } from "./lib.js";

it("should keep a nested bundle's runtime tables separate from the chunk's own", async () => {
	// the nested table must still hold its module, not the chunk's empty one
	expect(moduleIds).toEqual(["940"]);
	expect(value).toBe(42);
	// a dynamic import forces the chunk to have its own runtime tables
	const lazy = await import("./lazy.js");
	expect(lazy.default).toBe(7);
});
