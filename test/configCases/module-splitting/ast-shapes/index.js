import namedDefault, { eager, shaped } from "./shapes";
import { ka, useA } from "./impure-a";
import { kb, sideB } from "./impure-b";
import kc from "./impure-c";

it("analyzes assorted export and declaration shapes", () => {
	expect(eager).toBe("EAGER_VALUE_123");
	expect(typeof shaped).toBe("function");
	expect(namedDefault()).toBeGreaterThan(0);
	expect(ka).toBe("A_VALUE");
	expect(useA).toBe(1);
	expect(kb).toBe("B_VALUE");
	expect(sideB).toBe(2);
	expect(kc).toBe(3);
});
