import imported from "./imported.mjs";

it("should allow to use externals in concatenated modules", () => {
	expect(imported).toBe(1);
});

export { imported }