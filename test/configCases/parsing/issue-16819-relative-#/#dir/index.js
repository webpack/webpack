import { marker } from "./resolved.js";

it("should resolve relative entry paths containing '#' in a directory name", () => {
	// assert identity: the '#'-dir module resolved, not just a non-erroring build (webpack#16819)
	expect(marker).toBe("issue-16819-relative");
});
