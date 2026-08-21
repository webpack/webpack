// Imported zebra-first, so the tie-break is the only thing that can list
// alpha first inside the reason group.
import zebra from "./zebra";
import alpha from "./alpha";

it("should list equally sized bailouts in a stable order", () => {
	expect(zebra.fromCjs).toBe(1);
	expect(alpha.fromCjs).toBe(1);
});
