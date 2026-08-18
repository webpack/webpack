import { other } from "./barrel";

it("should stay silent when the barrel itself wants the module", () => {
	expect(other).toBe(2);
	expect(globalThis.__shared).toBe(true);
	expect(__STATS__.hints).toHaveLength(0);
});
