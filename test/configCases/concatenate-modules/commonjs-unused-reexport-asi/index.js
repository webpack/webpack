import { load } from "./entry.mjs";

it("should not merge an unused reexport's dropped assignment into the previous statement", () => {
	expect(load(1)).toBe(2);
});
