import d1 from "pck";
import d2 from "#internal";

it("imports field to resolve to the same", () => {
	expect(d1).toBe(d2);
});
