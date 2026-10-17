const deleted = WATCH_STEP === "1";

for (const [name, load, keys] of [
	["export { a as r } from", () => require("./named"), ["own", "r"]],
	["export * from", () => require("./star"), ["a", "own"]]
]) {
	it(`should follow ${name} of a deleted and restored module`, () => {
		if (deleted) {
			expect(load).toThrow(/Cannot find module '\.\/target'/);
			// the exports defined before the throw stay in the module cache
			expect(Object.keys(load())).toEqual(["own"]);
			return;
		}
		expect(Object.keys(load()).sort()).toEqual(keys);
	});
}
