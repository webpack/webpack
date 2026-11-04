function assigned() {
	var local = 1;
	var copy = local;
	var literal = "x";
	var member = custom.member;
	var called = local.custom();
	var method = local.toString();
	copy = literal;
	return [copy, member, called, method];
}

it("should rename through evaluate hooks a plugin taps", () => {
	expect(typeof assigned).toBe("function");
});
