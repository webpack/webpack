import { f } from "./shared";

it("should keep exports used by entry b", () => {
	expect(f()).toBe("f");
});
