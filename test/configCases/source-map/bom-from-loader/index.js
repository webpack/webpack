import value from "./mod.js";

it("should run a module whose loader produced a BOM", () => {
	expect(value).toBe("BOM_SOURCE_MAP_TOKEN");
});
