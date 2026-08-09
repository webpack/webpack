import { eager } from "./lib";

it("does not redirect a weak import to a facade", async () => {
	expect(eager).toBe("EAGER_VALUE_123");
	// A weak import creates no chunk, so it must still find the host module.
	const ns = await import(/* webpackMode: "weak" */ "./lib");
	expect(ns.lazy).toBe("WEAK_GUARD_PAYLOAD");
});
