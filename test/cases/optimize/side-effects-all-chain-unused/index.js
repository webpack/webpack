import { log } from "pmodule/tracker";
import { a } from "pmodule";

it("should not evaluate a chain of modules", function() {
	expect(a).toBe("a");
	expect(log).toEqual(["a.js"]);
});
