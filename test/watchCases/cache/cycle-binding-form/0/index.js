// `export const` in a.js, `export default` in c.js
for (const [file, load, names] of [
	["a.js", () => require("./a.js"), ["keys", "value"]],
	["c.js", () => require("./c.js"), ["default", "keys"]]
]) {
	it(`should define ${file}'s exports up front once a require() cycle reaches it`, () => {
		const module = load();
		// every export used as a whole object, so none is inlined or renamed
		expect(Object.keys(module).sort()).toEqual(names);
		expect(module.keys()).toEqual(WATCH_STEP === "1" ? names : null);
	});
}
