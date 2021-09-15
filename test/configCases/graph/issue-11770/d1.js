import { value2, value3 } from "./shared2";

it("should have the correct value", () => {
	expect(value2).toBe(42);
	expect(value3).toBe(42);
});
