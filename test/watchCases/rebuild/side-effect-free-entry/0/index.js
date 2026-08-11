import { value } from "./changing";

it("should keep the graph when the entry itself is side-effect-free", () => {
	expect(value).toBe(WATCH_STEP === "0" ? 0 : 1);
	const names = STATS_JSON.modules.map((m) => m.name);
	expect(names.filter((n) => /index\.js$/.test(n))).toHaveLength(1);
	expect(names.filter((n) => /changing\.js$/.test(n))).toHaveLength(1);
});
