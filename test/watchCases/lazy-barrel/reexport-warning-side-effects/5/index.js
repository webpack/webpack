import { a, r0 } from "./pkg/barrel";
import { b } from "./pkg/named";
import { default as defaultExport } from "./pkg/default";
import { b as imported } from "./pkg/imported";
import { a as direct } from "./pkg/target";

it("should request the deferred names by name", () => {
	expect(a).toBe("barrel");
	expect([r0, b, defaultExport, imported]).toEqual([
		undefined,
		undefined,
		undefined,
		undefined
	]);
	expect(direct).toBe("target");
});
