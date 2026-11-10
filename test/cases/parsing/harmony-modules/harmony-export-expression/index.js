import a from "./a.js";
import c from "./c.js";
import d from "./d.js";
import e from "./e.js";
import f from "./f.js";
import h from "./h.js";
import { value, bump } from "./i.js";

it("harmony-export-expression: should work", async function() {
	expect((await a).default(2, 3)).toBe(5);
	expect(c).toBe(3);
	expect(d()).toBe(2);
	expect(e).toBe(10);
});

it("harmony-export-expression: should export an imported namespace as default", function() {
	expect(f.member).toBe(42);
});

it("harmony-export-expression: should snapshot a named import exported as default", function() {
	bump();
	expect(h).toBe(1);
	expect(value).toBe(2);
});
