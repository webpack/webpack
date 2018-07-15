import def from "./module?harmony";
import * as mod from "./module?harmony-start"

it("should export a sequence expression correctly", function() {
	expect(require("./module?cjs")).toEqual(nsObj({ default: 2 }));
	expect(def).toBe(2);
	expect(mod.default).toBe(2);
});
