import { order } from "./tracker.js";
import { load } from "./lazy.js";
import { read } from "./deferring.js";
import "./before.js";
import "./target.js";

it("should evaluate the module at its import after a deferred one", () => {
	expect(order).toEqual(["lazy", "deferring", "before", "target"]);
	expect(typeof load).toBe("function");
	expect(read()).toBe(1);
});
