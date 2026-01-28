import a from "./a.js";
import c from "./c.js";
import d from "./d.js";
import e from "./e.js";

it("should work", async function() {
	expect((await a).default(2, 3)).toBe(5);
	expect(c).toBe(3);
	expect(d()).toBe(2);
	expect(e).toBe(10);
});
