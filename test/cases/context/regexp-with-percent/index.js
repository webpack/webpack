"use strict";

// never called; its regexp spells `|` as `%7C`
// eslint-disable-next-line no-unused-vars
function unused() {
	return require.context("./dir", false, /^\.\/(a%7Cb)\.js$/);
}

it("keeps a context whose regexp holds % apart from one with |", () => {
	const context = require.context("./dir", false, /^\.\/(a|b)\.js$/);
	expect(context.keys().sort()).toEqual(["./a.js", "./b.js"]);
	expect(context("./b.js")).toBe("b");
});
