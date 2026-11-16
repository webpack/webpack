import { x } from "./shared";

it("should use x from the copy of shared without y", () => {
	expect(x.name).toBe("x");
});
