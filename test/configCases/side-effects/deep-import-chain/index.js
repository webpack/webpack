import { value, config } from "./src/chain/mod-0.js";

it("should compile a deep cyclic chain of side-effect-free imports without overflowing the stack", () => {
	expect(config.id).toBe(0);
	// value is a chain of nested arrays — innermost element is from the cycle close
	expect(Array.isArray(value)).toBe(true);
});
