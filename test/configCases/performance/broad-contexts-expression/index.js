// webpack derives `^\.\/.*\.js$` from the expression, which is broad without
// ever being the filter `require.context` falls back to.
const load = (name) => require("./locale/" + name + ".js");

it("should warn about an expression matching a whole directory", () => {
	expect(load("aa").default).toContain("aa");
});
