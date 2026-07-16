import mod from "./mod";

it("should report strict-mode violations as errors when configured", () => {
	expect(mod.value).toBe(42);
});
