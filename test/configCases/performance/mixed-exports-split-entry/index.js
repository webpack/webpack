import { named } from "./named-only";

it("should read only the entry module whose exports reach the consumer", () => {
	expect(named).toBe(2);
	// Every chunk format renders the startup with the last entry module, so
	// nothing this one does not export can reach a consumer.
	expect(__STATS__.warnings).toHaveLength(0);
});
