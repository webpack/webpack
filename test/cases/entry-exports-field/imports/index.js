import d1 from "./pkg.mjs";
import d2 from "#internal";

it("imports field to resolve to the same", () => {
	expect(d1).toBe(d2);
});
