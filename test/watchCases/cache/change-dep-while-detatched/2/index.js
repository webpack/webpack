import value from "./module";
import value2 from "./unrelated";

it("should detect changes to dependencies while module is detached", () => {
	expect(value).toBe(42);
	expect(value2).toBe(42);
});
