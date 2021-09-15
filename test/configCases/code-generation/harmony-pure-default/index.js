import { value as v1 } from "./module1";
import { value as v2 } from "./module2";
import { value as v3 } from "./module3";
import { value as v4 } from "./module4";

it("should not execute exports when annotated with pure comment", () => {
	expect(v1).toBe(42);
	expect(v2).toBe(42);
	expect(v3).toBe(42);
	expect(v4).toBe(42);
});
