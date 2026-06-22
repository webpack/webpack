// The `Deno` namespace is a runtime-provided global; webpack must leave it as a
// free global (no bundling, shimming or renaming) so the standard API works.
it("should keep Deno's standard API available as a global", () => {
	expect(typeof Deno).toBe("object");
	expect(typeof Deno.cwd).toBe("function");
	expect(typeof Deno.cwd()).toBe("string");
	expect(typeof Deno.readTextFile).toBe("function");
	expect(typeof Deno.env.get).toBe("function");
});
