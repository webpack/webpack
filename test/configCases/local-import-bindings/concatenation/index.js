import { fromA } from "./a";
import { fromB } from "./b";

// Scope hoisting names an import itself, so the modules it merged declare no
// binding here — two of them naming one import would share the declaration.
it("leaves the bindings of a concatenated module to scope hoisting", () => {
	expect(fromA).toBe("x");
	expect(fromB).toBe("y");
});
