import { x, y } from "./shared";

it("should use x and y from the copy of shared with y", () => {
	expect(x.name).toBe("x");
	expect(y.name).toBe("y");
});
