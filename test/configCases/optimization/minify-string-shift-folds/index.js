function joined(x) {
	return "a" + ("b" + x);
}

function converted(x) {
	return [String(x + "s")];
}

function shifted(v, s) {
	return (v | 0) >>> s;
}

function pattern(n) {
	return `${(0, /c/g)}${n}`;
}

it("should join a string literal with the one opening the `+` added to it", () => {
	expect(joined(1)).toBe("ab1");
	expect(joined("x")).toBe("abx");
});

it("should print `String` of a string as that string", () => {
	expect(converted(1)).toEqual(["1s"]);
	expect(converted("q")).toEqual(["qs"]);
});

it("should drop a `|0` an operand of `>>>` takes", () => {
	expect(shifted(-1, 0)).toBe(4294967295);
	expect(shifted(4.7, 1)).toBe(2);
});

it("should write a regexp a sequence ends with as template text", () => {
	expect(pattern(1)).toBe("/c/g1");
	expect(pattern(2)).toBe("/c/g2");
});
