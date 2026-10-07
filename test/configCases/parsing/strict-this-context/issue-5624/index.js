import * as M from "./module";

it("issue-5624: should allow conditionals as callee", function() {
	var x = (true ? M.fn : M.fn)();
	expect(x).toBe("ok");
});

it("issue-5624: should allow conditionals as object", function() {
	var x = (true ? M : M).fn();
	expect(x).toBe("ok");
});
