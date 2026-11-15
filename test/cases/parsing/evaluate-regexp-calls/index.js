it("should fold a replace or split call with a plain regexp", () => {
	if ("foo-bar".replace(/-+/g, "_") !== "foo_bar") require("./missing-replace");
	if ("x1y22z".replace(/\d+|[yz]/g, "") !== "x") require("./missing-alternation");
	if ("a12b".replace(/\p{Nd}{1,3}?/u, "") !== "a2b") require("./missing-braces");
	if ("ab".replace(/(?<first>a)(?=b)/, "") !== "b") require("./missing-group");
	if ("a{b".replace(/\u{7B}/u, "") !== "ab") require("./missing-escape");
	if ("a{b".replace(/{/, "") !== "ab") require("./missing-brace");
	if ("abc".replace(/(?:a)?b/, "") !== "c") require("./missing-optional");
	expect("foo-bar".replace(/-+/g, "_")).toBe("foo_bar");
});

it("should leave a replace or split call to runtime when its regexp can backtrack for long", () => {
	// Never called: running these takes as long at runtime as it would at build time.
	function unused() {
		if ("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!".replace(/(a+)+$/, "") === "x") return 1;
		if ("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!".split(/(a|a)*$/).length === 0) return 2;
		if ("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!".replace(/a*a*a*a*a*a*$/, "") === "x") return 3;
		if ("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!".replace(new RegExp("[\\q{a|aa}]+$", "v"), "") === "x") return 4;
		if ("aa".replace(/(a)\1/, "") === "x") return 5;
		if ("aa".replace(/(?<a>a)\k<a>/, "") === "x") return 6;
		if ("ab".replace(new RegExp("[[a-z]--[b]]", "v"), "") === "x") return 7;
		return 0;
	}
	expect(typeof unused).toBe("function");
});
