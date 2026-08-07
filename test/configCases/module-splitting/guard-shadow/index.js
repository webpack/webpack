import { eager } from "./lib";

it("keeps a declaration that references a shadowed module binding", async () => {
	expect(eager).toBe("EAGER_VALUE_123");
	const mod = await import("./route");
	// Splitting would have copied a declaration whose `helper` is unavailable.
	expect(mod.default).toBe("MODULE_SCOPE_HELPER");
});
