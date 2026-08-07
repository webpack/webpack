import { eager } from "./lib";
const viaRequire = require("./cjs");

it("does not split a module reached through CommonJS", async () => {
	expect(eager).toBe("EAGER_VALUE_123");
	const payload = (await import("./route")).default;
	expect(payload.tag).toBe("CJS_GUARD_PAYLOAD");
	// Splitting would evaluate the binding twice, so the CommonJS consumer and
	// the async consumer would hold different objects.
	expect(viaRequire).toBe(payload);
});
