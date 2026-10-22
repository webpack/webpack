// a.js has an `export const`, c.js an `export default`; the cycle is formed at
// steps 0 and 2 and broken at step 1
const cycle = WATCH_STEP !== "1";

for (const [file, load, value] of [
	["a.js", () => require("./a.js"), "alpha"],
	["c.js", () => require("./c.js"), "default"]
]) {
	it(`should define ${file}'s exports as the cycles around it ask`, () => {
		const module = load();
		// getters are defined up front by name, values after the module ran
		expect(Object.keys(module)).toEqual(
			cycle ? [value, "keys"].sort() : ["keys", value]
		);
		expect(module.keys()).toEqual(cycle ? [value, "keys"].sort() : null);
	});
}
