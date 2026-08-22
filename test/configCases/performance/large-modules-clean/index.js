import p from "./p";
import q from "./q";
import r from "./r";

it("should stay quiet when no module carries the chunk", () => {
	// Each clears the size floor, so only the dominance test keeps this quiet.
	expect([p, q, r]).toHaveLength(3);
	expect(p.length).toBe(60000);
});
