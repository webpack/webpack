function assigned() {
	var local = 1;
	var copy = local;
	var literal = "x";
	var member = custom.member;
	copy = literal;
	return [copy, member];
}

it("should rename through evaluate hooks a plugin taps", () => {
	expect(typeof assigned).toBe("function");
});
