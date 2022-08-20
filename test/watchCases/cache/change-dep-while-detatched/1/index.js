import value from "./module";

it("should detect changes to dependencies while module is detached", () => {
	expect(value).toBe(42);
});
