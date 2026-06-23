import a from "./a";

it("should mark both modules of an ESM import cycle as circular", () => {
	expect(a).toBe("a");
});
