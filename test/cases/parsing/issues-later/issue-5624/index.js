import { fn } from "./module";

it("issue-5624: should allow conditionals as callee", function() {
	var x = (true ? fn : fn)();
	expect(x).toBe("ok");
});
