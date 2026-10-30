import { value } from "./value.js";

it("should restore modules when build dependencies import aliased builtins", () => {
	expect(value).toBe(42);
});
