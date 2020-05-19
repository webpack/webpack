import { value as v1, check as c1 } from "./module";
import { value as v2, check as c2 } from "./module-normal";

it("should allow to optimize exports in modules using 'module'", () => {
	expect(v1).toBe(42);
	expect(v2).toBe(42);
	expect(c1).toBe(c2);
});
