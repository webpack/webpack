import * as module from "./modules/common.js";
import getGlobalThis from "./utils/get-global-this.js";

it("should contain a valid value", async function() {
	expect(module.default).toBe("common");

	const dyn = await import("./modules/common-dyn.js");

	expect(dyn.default).toBe("common-dyn");
});

getGlobalThis()._COMMON = true;

export default "common";
