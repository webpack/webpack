import { eager } from "./lib";

it("does not split a declaration a dependency template rewrites", async () => {
	expect(eager).toBe("EAGER_VALUE_123");
	const mod = await import("./route");
	// The DefinePlugin value must survive; copying the raw source would lose it.
	expect(mod.default.flag).toBe("DEFINE_GUARD_PAYLOAD");
});
