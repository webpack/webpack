function tag(strings) {
	return strings;
}

function pick(x) {
	switch (x) {
		case 0:
			return tag`x`;
		case 1:
			return tag`x`;
	}
}

function same(x) {
	switch (x) {
		case 0:
			return "zero or one";
		case 1:
			return "zero or one";
		default:
			return "other";
	}
}

it("should merge cases running alike but keep each tagged template's own object", () => {
	expect(pick(0)).not.toBe(pick(1));
	expect(pick(0)).toBe(pick(0));
	expect(same(0)).toBe("zero or one");
	expect(same(1)).toBe("zero or one");
	expect(same(2)).toBe("other");
});
