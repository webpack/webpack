import * as module from "./modules/module.js";

it("should contain a valid value", function() {
	expect(module.default).toBe("free");
});
