import { fn } from "./module";

it("should allow conditionals as callee", function() {
	var x = (true ? fn : fn)();
	expect(x).toBe("ok");
});
