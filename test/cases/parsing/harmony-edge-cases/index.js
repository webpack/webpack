import { a } from "./a";
import x, { b } from "./b";
import { c, d } from "./fake-reexport";

it("should be able to use exported function", function() {
	expect(a).toBe("ok");
	expect(b).toBe("ok");
	expect(x()).toBe("ok");
	expect(c).toBe("ok");
	expect(d).toBe("ok");
});
