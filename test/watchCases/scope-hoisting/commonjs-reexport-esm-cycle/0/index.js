import * as namespace from "./namespace";
import { readReexport, value } from "./module";

it("should keep a namespace re-export cycle working in every step", () => {
	expect(Object.keys(namespace)).toEqual(["cjs"]);
	expect(namespace.cjs.esm).toBe(namespace);
	expect(namespace.cjs.extra).toBe(WATCH_STEP === "0" ? "first" : "second");
});

it("should keep a required re-export of an ES module working in every step", () => {
	expect(value).toBe(WATCH_STEP === "2" ? 2 : 1);
	expect(readReexport()).toBe(`${value}:true`);
});
