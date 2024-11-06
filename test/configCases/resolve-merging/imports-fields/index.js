import d1 from "./pkg.mjs";
import d2 from "#internal";
import { d3, d4 } from "lib";

it("imports field to resolve to the same", () => {
	expect(d2).toBe(d1);
	expect(d4).toBe(d3);
});
