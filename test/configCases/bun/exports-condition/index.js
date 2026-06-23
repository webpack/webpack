import foo from "foo";

// The bun target resolves the `bun` exports condition with priority over
// `node`, so the package's bun-specific entry must win.
it("should resolve the bun exports condition", () => {
	expect(foo).toBe("bun");
});
