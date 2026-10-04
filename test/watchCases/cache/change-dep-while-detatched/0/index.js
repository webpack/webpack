import value from "./module";
import value2, { asyncValue } from "./unrelated";

it("should detect changes to dependencies while module is detached", async () => {
	expect(value).toBe(42);
	expect(value2).toBe(42);
	expect(await asyncValue).toBe(42);
});
