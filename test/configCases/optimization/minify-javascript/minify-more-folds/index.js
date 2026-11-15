var log = [];

function spreads(index) {
	return [
		[10, ...[], 20, ...[30, 40], 50]["length"],
		[10, ...[], 20, ...[30, 40], 50][3],
		[...[10, 20]][5],
		[...[10, 20]][index]
	];
}

function added(x) {
	var y;
	return ["" + (x += "foo"), (y = "a") + "", x, y];
}

function C() {
	this.v = 1;
}

function make() {
	log.push("make");
	return C;
}

function* constructs() {
	var t = yield make();
	return new t();
}

function constructed() {
	var t = make();
	return new t(1).v;
}

function tail() {
	return (function () {
		log.push("tail");
	})();
}

it("should read an array spreading array literals", () => {
	expect(spreads(1)).toEqual([5, 40, undefined, 20]);
});

it("should print an empty string added to a string assignment as the assignment", () => {
	expect(added(1)).toEqual(["1foo", "a", "1foo", "a"]);
});

it("should fold a value into what `new` constructs, and print a tail call returning nothing", () => {
	log.length = 0;
	var it = constructs();
	it.next();
	expect(it.next(C).value.v).toBe(1);
	expect(constructed()).toBe(1);
	expect(tail()).toBe(undefined);
	expect(log).toEqual(["make", "make", "tail"]);
});
