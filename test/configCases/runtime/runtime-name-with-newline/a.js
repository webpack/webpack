import { f } from "./shared";

it("should keep exports used by entry a", () => {
	expect(f()).toBe("f");
});
