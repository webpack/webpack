import {
	byComputedName,
	cjsKeys,
	esmKeys,
	esmMarker,
	looped,
	spread,
	stringified
} from "./consumer";

it("should keep the export names of a required ESM module readable", () => {
	expect(esmKeys).toEqual(["alpha", "beta"]);
	expect(esmMarker).toBe(true);
});

it("should keep the export names of a required CommonJS module readable", () => {
	expect(cjsKeys).toEqual(["delta", "gamma"]);
});

it("should spread the required exports object under its written names", () => {
	expect(spread).toEqual({ delta: "delta", gamma: "gamma" });
});

it("should enumerate the required exports object", () => {
	expect(looped).toEqual(["delta", "gamma"]);
});

it("should answer a computed property read", () => {
	expect(byComputedName("gamma")).toBe("gamma");
	expect(byComputedName("delta")).toBe("delta");
});

it("should serialize the required exports object", () => {
	expect(JSON.parse(stringified)).toEqual({ delta: "delta", gamma: "gamma" });
});
