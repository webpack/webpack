import * as inner from "./inner";
import { x } from "./other";

it("should compile a namespace object reexport", () => {
	expect(inner.a).toBe(1);
	expect(inner.b).toBe(2);
	expect(x).toBe("undefined");
});
