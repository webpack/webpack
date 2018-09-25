import x1, { value as v1 } from "./module1";
import x2, { value as v2 } from "./module2";
import { value as v3 } from "./module3";
import x4, { value as v4 } from "./module4";

it("should not execute exports when annotated with pure comment", () => {
	expect(v1).toBe(42);
	expect(v2).toBe(42);
	expect(v3).toBe(42);
	expect(v4).toBe(42);
});

var x = /*#__PURE__*/(function() {
	return x1 + x2 + x4;
});
