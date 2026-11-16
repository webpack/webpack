import { order } from "./tracker.js";
import { load } from "./lazy.js";
import "./second.js";
import "./first.js";

it("should evaluate a lazily required module at its import", () => {
	expect(order).toEqual(["second", "first"]);
	expect(typeof load).toBe("function");
});
