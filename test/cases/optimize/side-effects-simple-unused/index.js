import { log } from "pmodule/tracker";
import { x, z } from "pmodule";
import def from "pmodule";

it("should not evaluate a simple unused module", function() {
	expect(def).toBe("def");
	expect(x).toBe("x");
	expect(z).toBe("z");
	expect(log).toEqual(["b.js", "c.js", "index.js"]);
});
