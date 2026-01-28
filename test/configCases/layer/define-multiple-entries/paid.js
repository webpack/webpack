import * as module from "./modules/module.js";
import getGlobalThis from "./utils/get-global-this.js";

it("should contain a valid value", async function() {
	expect(getGlobalThis()._COMMON).toBe(true);
	expect(module.default).toBe("paid");

	const dyn = await import("./modules/dyn.js");

	expect(dyn.default).toBe("dyn");

	const extraDyn = await import("./modules/extra-dyn.js");

	expect(extraDyn.default).toBe("extra-dyn");

	const dynDefine = await import("./modules/dyn-define.js");

	expect(dynDefine.default).toBe("paid");
});
