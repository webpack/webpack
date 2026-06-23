import { EOL } from "os";

// Bun exposes both web APIs and node.js built-ins; the bun target must keep
// both available in a single ESM bundle. (`fetch` is also a Bun global, but the
// jest vm sandbox doesn't surface it, so assert `WebAssembly` instead.)
it("should expose web globals alongside node.js built-ins", () => {
	expect(typeof globalThis).toBe("object");
	expect(typeof WebAssembly).toBe("object");
	expect(typeof EOL).toBe("string");
});
