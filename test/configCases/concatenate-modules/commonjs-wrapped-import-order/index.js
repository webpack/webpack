// a wrapped CJS member imported before a hoisted ESM member must still run
// first: ESM evaluates dependencies in import order
import "./cjs-first";
import { v } from "./esm-second";
// the same holds one level down: "nested-inner" is reached only through the
// wrapped "nested-outer", so neither may be displaced past "nested-after"
import { label } from "./nested-outer";
import "./nested-after";
import "./nested-consumer";

it("should evaluate imports in source order across wrapped and hoisted members", () => {
	expect(v).toBe("esm-second");
	expect(global.__importOrder).toEqual(["cjs-first", "esm-second"]);
});

it("should evaluate a nested wrapped chain in source order", () => {
	expect(label).toBe("outer:inner");
	expect(global.__nestedOrder).toEqual([
		"nested-inner",
		"nested-outer",
		"nested-after",
		"nested-consumer"
	]);
	delete global.__importOrder;
	delete global.__nestedOrder;
});
