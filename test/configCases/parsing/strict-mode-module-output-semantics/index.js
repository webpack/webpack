import "./strict.js";
import mod from "./mod.js";

it("should report semantic strict-mode hazards as warnings and still run", () => {
	expect(mod.value).toBe(42);
	expect(mod.shadowsUndefined()).toBe(2);
});
