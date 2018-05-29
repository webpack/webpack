import def from "./module?harmony";
import * as mod from "./module?harmony-start"

it("should export a sequence expression correctly", function() {
	expect(require("./module?cjs")).toEqual({ default: 2, [Symbol.toStringTag]: "Module" });
	expect(def).toBe(2);
	expect(mod.default).toBe(2);
});
