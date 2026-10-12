import { eager, getTable } from "./lib";

it("keeps one binding when the host still reads a split export", async () => {
	expect(eager).toBe("EAGER_VALUE_123");
	const mod = await import("./route");
	expect(mod.get()).toBe(getTable());
});
