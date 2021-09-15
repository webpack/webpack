import * as X from "./module";

it("should generate valid code", () => {
	expect(X["x\\"]).toBe(42);
});
