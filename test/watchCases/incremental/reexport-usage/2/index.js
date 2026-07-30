import { b } from "./barrel";

it("should re-export a name that was unused in the previous rebuild", () => {
	expect(b).toBe("b");
});
