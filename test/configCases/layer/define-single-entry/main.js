import * as module from "./modules/module.js";

it("should contain a valid value", async function() {
	expect(module.default).toBe(FREE_VERSION ? "free" : "paid");

	const dyn = await import("./modules/dyn.js");

	expect(dyn.default).toBe("dyn");

	const dynDefine = await import("./modules/dyn-define.js");

	expect(dynDefine.default).toBe(FREE_VERSION ? "free" : "paid");
});
