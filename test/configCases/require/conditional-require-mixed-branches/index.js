function load(flag, name) {
	return require(flag ? "./outside" : "./dir/" + name);
}

function loadWithFunctionBranch(flag, name) {
	return require(flag
		? (function () {
				return require("./dir/b");
			},
			"./outside")
		: "./dir/" + name);
}

it("should resolve the string branch of a mixed conditional require", () => {
	expect(load(true, "a")).toBe("outside");
	expect(loadWithFunctionBranch(true, "a")).toBe("outside");
});

it("should resolve the expression branch of a mixed conditional require", () => {
	expect(load(false, "a")).toBe("a");
	expect(loadWithFunctionBranch(false, "b")).toBe("b");
});
