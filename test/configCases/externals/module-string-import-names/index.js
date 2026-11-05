import * as ext from "ext-module";
import { "a-b" as dash, café as cafe } from "ext-module";

it("should import string-named exports of a module external", () => {
	expect(dash).toBe(1);
	expect(ext["c d"]).toBe(2);
	expect(ext["a_b"]).toBe(3);
	expect(ext.plain).toBe(4);
	expect(cafe).toBe(5);
});
