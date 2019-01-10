import * as M from "./module";

it("should allow conditionals as callee", function() {
	var x = (true ? M.fn : M.fn)();
	expect(x).toBe("ok");
});

it("should allow conditionals as object", function() {
	var x = (true ? M : M).fn();
	expect(x).toBe("ok");
});
