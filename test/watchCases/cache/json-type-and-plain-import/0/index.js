import { typed } from "./typed.js";
import { plain } from "./plain.js";

it("keeps a type json import apart from a plain one", () => {
	expect(typed.keys).toEqual(["default"]);
	expect(plain.a).toBe(1);
	expect(plain.keys).toContain("a");
});
