import { a } from "./pkg";

it("should defer the unrequested re-export of a side-effect-free barrel", () => {
	expect(a).toBe("a");
});
