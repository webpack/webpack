var log = [];

function note(value) {
	log.push(value);
	return value;
}

function strings(value) {
	return [String(value), `${String(value)}`, 1 - String(value)];
}

function points() {
	return ["a".codePointAt(1), "ab".codePointAt(0)];
}

function types() {
	return [typeof function () {}.valueOf(), typeof [].valueOf(), typeof class {}];
}

function symbol() {
	return typeof Symbol("kept");
}

it("should fold the constant reads as written", () => {
	expect(strings(note(2))).toEqual(["2", "2", -1]);
	expect(points()).toEqual([undefined, 97]);
	expect(types()).toEqual(["function", "object", "function"]);
	expect(symbol()).toBe("symbol");
	expect(log).toEqual([2]);
});
