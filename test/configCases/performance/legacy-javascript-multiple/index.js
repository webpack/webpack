import helpers from "@babel/runtime";
import regenerated from "regenerator-runtime";

it("should report several packages, largest first", () => {
	expect(helpers).toBe("helpers");
	expect(regenerated).toMatch(/^regenerated /);
});
