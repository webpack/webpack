var seen = [];

function unset() {
	void 0 ||
		function () {
			seen.push("void");
		}.call();
}

function object() {
	({}) &&
		function () {
			seen.push("object");
		}.call();
}

it("should parenthesize a function the side a known left side leaves opens with", () => {
	unset();
	object();
	unset();
	object();
	expect(seen).toEqual(["void", "object", "void", "object"]);
});
