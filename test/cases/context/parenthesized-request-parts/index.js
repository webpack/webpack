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

it("should close a single-part String.raw request in a logical expression", () => {
	expect(require(true && (String.raw`./dir/hello`))).toBe("hello");
});

it("should keep the text after a single-part String.raw request a string", () => {
	let ran = false;
	const load = () => {
		// prettier-ignore
		if (0, require(true && (String.raw`./dir/hello`)) / "/;ran = true;/[") {} / 1]/g;
	};
	load();
	expect(ran).toBe(false);
});
