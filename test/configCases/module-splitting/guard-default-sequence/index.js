import { eager } from "./lib";

it("keeps a parenthesized default export one expression when split", async () => {
	expect(eager).toBe("EAGER_VALUE_123");
	const mod = await import("./route");
	expect(typeof mod.default.payload).toBe("string");
});
