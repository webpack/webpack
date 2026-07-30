import { a, b } from "./barrel";

it("should re-export a name that was unused in the previous rebuild", () => {
	expect(a).toBe("a");
	expect(b).toBe("b");
});
