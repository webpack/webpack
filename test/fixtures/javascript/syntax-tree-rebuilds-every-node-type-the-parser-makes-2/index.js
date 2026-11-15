
import a, { b as c, "d" as e } from "x" with { type: "json" };
import * as ns from "y";
import defer * as lazy from "z";
export const f = 1;
export default class extends a {}
export { f as g, c };
export * as h from "x";
export * from "x" with { type: "json" };
await import("x", { with: { type: "json" } });
import.meta.url;
import.defer("x");
