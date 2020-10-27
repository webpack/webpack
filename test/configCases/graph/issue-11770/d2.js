import { other2, value3 } from "./shared2";

it("should have the correct value", () => {
	expect(other2).toBe("other");
	expect(value3).toBe(42);
});
