import { order } from "./tracker.js";
import { load } from "./lazy.js";
import { load as loadNested } from "./nested-lazy.js";
import "./before.js";
import "./target.js";

it("should evaluate the module at its import after one in a lazy module", () => {
	expect(order).toEqual(["lazy", "nested-lazy", "before", "target"]);
	expect(typeof load).toBe("function");
	expect(typeof loadNested).toBe("function");
});
