import { value, config } from "./src/chain/mod-0.js";

it("should compile a deep linear chain of side-effect-free imports without overflowing the stack", () => {
	expect(config.id).toBe(0);
	// value is a chain of nested arrays — innermost element is from the terminal module
	expect(Array.isArray(value)).toBe(true);
});
