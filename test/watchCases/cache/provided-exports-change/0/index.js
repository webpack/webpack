import * as ns from "./lib";

// Read through a computed key: a static member access would warn at the step
// where the export does not exist yet.
const read = (name) => ns[name];

it("should see exports a cached provider gained on rebuild", () => {
	const step = Number(WATCH_STEP);
	expect(read("BASE")).toBe("base");
	expect(Object.keys(ns).sort()).toEqual(
		step === 0 ? ["BASE"] : step === 1 ? ["BASE", "SECOND"] : ["BASE", "THIRD"]
	);
	expect(read("SECOND")).toBe(step === 1 ? "second" : undefined);
	expect(read("THIRD")).toBe(step === 2 ? "third" : undefined);
});
