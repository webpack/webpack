import { existsSync } from "./lib";

it("hashes a concatenated external info with its runtimeCondition (assertions run in plugin)", () => {
	expect(typeof existsSync).toBe("function");
});
