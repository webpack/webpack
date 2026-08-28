import { x } from "./cycle/a.js";
import * as ns from "./cycle/a.js";

it("should resolve a circular reexport to undefined instead of recursing", () => {
	// reading it forwarded to the other side and back until the stack blew
	expect(x).toBe(undefined);
	expect(ns.x).toBe(undefined);
});
