import m1 from "./module?1";
import m2 from "./module?2";
import { abc } from "./module?3";

it("should allow to import cjs with esm", () => {
	expect(m1.abc).toBe("abc");
	expect(m2).toEqual({ abc: "abc", def: "def" });
	expect(abc).toBe("abc");
});
