import { existsSync } from "./lib";

it("compiles with an external excluded from concatenation", () => {
	expect(typeof existsSync).toBe("function");
});
