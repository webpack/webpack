import { a } from "./a";
import x, { b } from "./b";
import { c, d } from "./fake-reexport";

it("should be able to use exported function", function() {
	expect(a).toEqual("ok");
	expect(b).toEqual("ok");
	expect(x()).toEqual("ok");
	expect(c).toEqual("ok");
	expect(d).toEqual("ok");
});
