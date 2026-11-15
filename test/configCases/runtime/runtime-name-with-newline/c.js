import { g } from "./shared";

it("should keep exports used by an entry whose name has a line break", () => {
	expect(g()).toBe("g");
});
