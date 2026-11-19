import { plain } from "./plain.js";
import { typed } from "./typed.js";

it("keeps them apart after a rebuild that reuses both importers", () => {
	expect(typed.keys).toEqual(["default"]);
	expect(plain.a).toBe(1);
	expect(plain.keys).toContain("a");
});
