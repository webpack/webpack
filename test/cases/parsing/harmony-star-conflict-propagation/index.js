import * as nestedA from "./nested/a.js";
import * as nestedB from "./nested/b.js";
import { x as cycleX } from "./cycle/a.js";
import * as cycleC from "./cycle/c.js";
import * as shadowParent from "./nested/shadow-parent.js";
import * as dynamicA from "./dynamic/a.js";

it("should keep a name ambiguous in a nested `export *` source ambiguous", () => {
	expect("x" in nestedB).toBe(false);
	expect("x" in nestedA).toBe(false);
	expect(Object.keys(nestedA)).toEqual([]);
	expect(nestedA.x).toBe(undefined);
});

it("should omit a name ambiguous through a star source in an import cycle", () => {
	expect(cycleX).toBe("e");
	expect("x" in cycleC).toBe(false);
	expect(cycleC.x).toBe(undefined);
	expect(Object.keys(cycleC)).toEqual([]);
});

it("should let a named export shadow names its `export *` sources conflict on", () => {
	expect(shadowParent.x).toBe(3);
	expect(Object.keys(shadowParent)).toEqual(["x"]);
});

it("should keep a nested ambiguous name ambiguous next to unknown exports", () => {
	expect("x" in dynamicA).toBe(false);
	expect(dynamicA.x).toBe(undefined);
	expect(dynamicA.y).toBe(1);
});
