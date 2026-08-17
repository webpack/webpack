import { shared } from "./shared";

it("should stay silent when the other entry never loads this chunk", () => {
	expect(shared).toBe(1);
	expect(__STATS__.hints).toHaveLength(0);
});
