const part = String("l");

const tests = {
	"concat with a parenthesized last part": () =>
		require("./dir/he".concat(part, "l", ("o"))),
	"concat with a parenthesized middle part": () =>
		require("./dir/he".concat(part, ("l"), "o")),
	"concat with constant parts before a parenthesized part": () =>
		require("./dir/h".concat(part.slice(1), "el", ("l"), "o")),
	"concat with only constant parts": () =>
		require("./dir/he".concat("l", ("l"), "o")),
	"plus with a parenthesized prefix part": () =>
		require("./dir/" + ("he" + part) + "lo"),
	"plus with a parenthesized left side": () =>
		require(("./dir/") + ("he" + part) + "lo"),
	"plus with a parenthesized postfix part": () =>
		require(("./dir/he" + part + "l") + ("o")),
	"plus with a parenthesized number part": () =>
		require(("./dir/he" + part + "lo") + (1))
};

for (const name of Object.keys(tests)) {
	it(`should resolve a request built by ${name}`, () => {
		expect(tests[name]()).toBe("hello");
	});
}
