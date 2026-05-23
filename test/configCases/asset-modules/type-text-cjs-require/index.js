it("should work with require() on a module that re-exports text", () => {
	const lib = require("./reexport");
	expect(lib.text).toContain("hello text");
	expect(lib.default).toContain("hello text");
});

it("should work with import() on a module that re-exports text", async () => {
	const lib = await import("./reexport");
	expect(lib.text).toContain("hello text");
	expect(lib.default).toContain("hello text");
});
