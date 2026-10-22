const deleted = WATCH_STEP === "1" || WATCH_STEP === "3";

for (const [name, load, keys, deletedKeys] of [
	["export { a as r } from", () => require("./named"), ["own", "r"], ["own"]],
	["export * from", () => require("./star"), ["a", "own"], ["own"]],
	[
		"export * from a module re-exporting it",
		() => require("./top"),
		["a", "own", "top"],
		["own", "top"]
	]
]) {
	it(`should follow ${name} of a deleted and restored module`, () => {
		if (deleted) {
			expect(load).toThrow(/Cannot find module '\.\/target'/);
			// the exports defined before the throw stay in the module cache
			expect(Object.keys(load()).sort()).toEqual(deletedKeys);
			return;
		}
		expect(Object.keys(load()).sort()).toEqual(keys);
	});
}
