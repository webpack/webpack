import * as m from "./cjs";

it("should import the whole module", () => {
	expect(typeof m).toBe("object");
	expect(typeof m.default).toBe("function");
});
