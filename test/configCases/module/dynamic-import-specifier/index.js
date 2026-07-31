import { shared } from "./shared.js";

// Chunks are addressed by a literal relative specifier, so ESM resolves them
// against the emitting bundle's own URL — no public path is involved.
it("should load chunks through relative specifiers on every target", async () => {
	const a = await import("./a.js");
	const b = await import("./b.js");
	expect(a.default + b.default + shared()).toBe(33);
});
