import def, { x, fn } from "./m/locals.js";
import { a, b, bb, c, s } from "./m/barrel.js";
import { order } from "./m/recorder.js";

it("should resolve every re-export form to the right value", () => {
	expect(a).toBe("a");
	expect(b).toBe("b");
	expect(bb).toBe("bb");
	expect(c).toBe("c");
	expect(s).toBe("s");
	expect(x).toBe("x");
	expect(fn()).toBe("fn");
	expect(def).toBe(42);
});

it("should execute imported modules in source order (loc-sorted dependencies)", () => {
	// `locals` is imported first, then the barrel re-exports a, b, c and the star target s
	expect(order).toEqual(["L", "a", "b", "c", "s"]);
});
