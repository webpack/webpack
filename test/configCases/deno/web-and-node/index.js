import { EOL } from "os";

// Deno exposes both node.js built-ins and web APIs; the deno target must keep
// both available in a single ESM bundle.
it("should expose web globals alongside node.js built-ins", () => {
	expect(typeof globalThis).toBe("object");
	expect(typeof fetch).toBe("function");
	expect(typeof WebAssembly).toBe("object");
	expect(typeof EOL).toBe("string");
});
