import { mul } from "./pure";
import pureObject from "./pure-object";
import { div } from "./impure";

it("should compute through annotated and plain module instantiations", () => {
	expect(mul(6, 7)).toBe(42);
	expect(pureObject.add(40, 2)).toBe(42);
	expect(div(84, 2)).toBe(42);
	expect(global.cjsEsmOutputImpure).toBe(1);
	delete global.cjsEsmOutputImpure;
});
