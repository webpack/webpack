import { a } from "./a";

it("should mark all modules of overlapping cycles as circular", () => {
	expect(a).toBe("a");
});
