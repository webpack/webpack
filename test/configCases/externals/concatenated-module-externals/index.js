import { doSomethingWithFs, existsSync } from "./lib.js";

it("should map external imports in a concatenated module", function() {
	expect(typeof doSomethingWithFs).toBe("function");
	expect(typeof existsSync).toBe("function");
});
