import { a } from "./barrel";

it("should re-export a name that was unused in the previous rebuild", () => {
	expect(a).toBe("a");
});
