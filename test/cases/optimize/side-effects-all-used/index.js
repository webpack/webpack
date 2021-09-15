import { log } from "pmodule/tracker";
import { a, x, z } from "pmodule";
import def from "pmodule";

it("should evaluate all modules", function() {
	expect(def).toBe("def");
	expect(a).toBe("a");
	expect(x).toBe("x");
	expect(z).toBe("z");
	expect(log).toEqual(["a.js", "b.js", "c.js", "index.js"]);
});
