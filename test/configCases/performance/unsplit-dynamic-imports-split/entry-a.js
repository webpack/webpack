import { shared } from "./shared";

it("should stay silent when the module is initial in another runtime only", () => {
	expect(shared).toBe(1);
	expect(__STATS__.hints).toHaveLength(0);
});
