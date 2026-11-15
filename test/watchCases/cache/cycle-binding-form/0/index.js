// a.js has an `export const`, c.js an `export default`; the cycle is formed at
// steps 0 and 2 and broken at step 1
const cycle = WATCH_STEP !== "1";

for (const [file, load, value] of [
	["a.js", () => require("./a.js"), "alpha"],
	["c.js", () => require("./c.js"), "default"]
]) {
	it(`should define ${file}'s exports as the cycles around it ask`, () => {
		const module = load();
		// A non-circular module's value export falls back to a getter when a
		// getter key sorts after it, so the keys stay sorted in every step
		expect(Object.keys(module)).toEqual([value, "keys"].sort());
		expect(module.keys()).toEqual(cycle ? [value, "keys"].sort() : null);
	});
}
