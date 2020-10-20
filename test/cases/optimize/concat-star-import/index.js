import { foo } from "./module";

it("should handle star import with name collision", () => {
	expect(foo()).toBe("1 21 2");
});
