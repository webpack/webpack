import { log } from "pmodule/tracker";
import { a, y } from "pmodule";

it("should not evaluate a reexporting transitive module", function() {
	expect(a).toBe("a");
	expect(y).toBe("y");
	expect(log).toEqual(["a.js", "b.js"]);
});
