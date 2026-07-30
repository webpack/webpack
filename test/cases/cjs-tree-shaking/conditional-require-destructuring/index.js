// Branches of `require(a ? b : c)` share one `valueRange`, so an empty
// destructure must not let each branch drop the same call.
const {} = require(global.__pick ? "./pure?a" : "./pure?b");
const {} = require(global.__pick ? "./pure?c" : "./effect?d");
const {} = require(
	global.__pick ? "./pure?e" : global.__pick2 ? "./pure?f" : "./pure?g"
);

it("keeps a conditional require with an empty destructure callable", () => {
	expect(global.__conditional_destructure_effect_ran).toBe(true);
	delete global.__conditional_destructure_effect_ran;
});

it("keeps every branch of a conditional require with an empty destructure", () => {
	expect(require.resolveWeak("./pure?a")).not.toBe(null);
	expect(require.resolveWeak("./pure?b")).not.toBe(null);
	expect(require.resolveWeak("./pure?e")).not.toBe(null);
	expect(require.resolveWeak("./pure?f")).not.toBe(null);
	expect(require.resolveWeak("./pure?g")).not.toBe(null);
});
