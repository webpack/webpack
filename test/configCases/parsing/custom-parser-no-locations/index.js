import { answer } from "./cjs.js";
import { value } from "./module.js";

it("should support a custom parser without location support", () => {
	expect(value).toBe(42);
	expect(answer).toBe("cjs");
});
