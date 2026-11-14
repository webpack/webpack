const flag = Math.random() > 2;
const name = String("./b");

function load() {
	return require(flag
		? (function () {
				return require("./b") + 1;
			},
			"./a")
		: name);
}

function loadSequence() {
	return require(flag ? (require("./b"), "./a") : name);
}

it("should keep code in a constant branch of a mixed conditional require", () => {
	expect(typeof load).toBe("function");
	expect(typeof loadSequence).toBe("function");
});
