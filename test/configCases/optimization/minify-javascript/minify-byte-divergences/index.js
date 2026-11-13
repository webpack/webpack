function Base() {
	this.v = 1;
}

Base.Child = function (n) {
	this.n = n;
};

function construct(log) {
	return [new (0, Base.Child)(2), new (0, Base)(), new (log.push("lead"), Base)()];
}

function pick(a, b, c, d) {
	const o = {};
	const x = a ? false : b ? c : d;
	const y = a ? true : (o.y = 1);
	const z = a ? (o.z = 2) : true;
	const w = a ? (o.w = 3) : false;
	return [x, y, z, w, o];
}

function guard(a, log) {
	if (a ? false : log.push("tested")) log.push("then");
	return log;
}

function first(n) {
	if (n) return n;
	else return;
}

function self() {
	return this || void 0;
}

function positions(a, b, log) {
	const o = { k: a ? false : (b.k = 1) };
	log.push(a ? false : (b.p = 2));
	const branch = b.c ? (a ? false : (b.q = 3)) : 0;
	const make = a ? false : () => 4;
	return [o.k, branch, typeof make];
}

function returned(a, b) {
	return a ? false : (b.r = 5);
}

function* produced(a) {
	return a ? false : yield 6;
}

function looped(n) {
	for (;;) {
		return n || void 0;
	}
}

function property() {
	return this.p || void 0;
}

it("should construct what a sequence ends in", () => {
	const log = [];
	const [a, b, c] = construct(log);
	expect(a.n).toBe(2);
	expect(b.v).toBe(1);
	expect(c.v).toBe(1);
	expect(log).toEqual(["lead"]);
});

it("should keep a conditional giving a boolean beside an assignment", () => {
	expect(pick(0, 1, 2, 3)).toEqual([2, 1, true, false, { y: 1 }]);
	expect(pick(1, 0, 2, 3)).toEqual([false, true, 2, 3, { z: 2, w: 3 }]);
	expect(guard(0, [])).toEqual(["tested", "then"]);
	expect(guard(1, [])).toEqual([]);
});

it("should keep a conditional in every value position", () => {
	const log = [];
	expect(positions(0, { c: 1 }, log)).toEqual([1, 3, "function"]);
	expect(log).toEqual([2]);
	expect(returned(0, {})).toBe(5);
	const it = produced(0);
	expect(it.next().value).toBe(6);
	expect(it.next(7)).toEqual({ value: 7, done: true });
});

it("should return what `return a || void 0` returns", () => {
	expect([looped(0), looped(8), property.call({ p: 9 })]).toEqual([undefined, 8, 9]);
	expect([first(0), first(2), self.call(3) == 3]).toEqual([undefined, 2, true]);
});
