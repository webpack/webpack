function early(a, b) {
	if (a) return;
	if (b) return 1;
}

function earlyChain(a, b, c) {
	if (a) return;
	if (b && c) return 2;
}

function earlyEither(a, b, c) {
	if (a) return;
	if (b || c) return 3;
}

function outerElse(a, b, c, log) {
	if (a) return;
	if (b) {
		if (c) return 4;
	} else log.push("outer");
}

function innerElse(a, b, c, log) {
	if (a) return;
	if (b) {
		if (c) return 5;
		else log.push("inner");
	}
}

it("should return early as the source does", () => {
	const log = [];
	for (const [a, b, c] of [
		[0, 0, 0],
		[0, 1, 0],
		[0, 1, 1],
		[1, 1, 1]
	]) {
		log.push(
			early(a, b),
			earlyChain(a, b, c),
			earlyEither(a, b, c),
			outerElse(a, b, c, log),
			innerElse(a, b, c, log)
		);
	}
	expect(log).toEqual([
		"outer",
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		"inner",
		1,
		undefined,
		3,
		undefined,
		undefined,
		1,
		2,
		3,
		4,
		5,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined
	]);
});

function counted(n) {
	const seen = [];
	for (let i = 0; i < n; 0, i++, 0) seen.push(i);
	return seen;
}

function deadUpdate(a, b) {
	for (; a < 3; b++, 1) a++;
	return a;
}

function liveUpdate(n, log) {
	let i = 0;
	for (; i < n; log.push(i), i++);
	return log;
}

it("should run a loop's update as the source does", () => {
	expect(counted(3)).toEqual([0, 1, 2]);
	expect(counted(0)).toEqual([]);
	expect(deadUpdate(0, 0)).toBe(3);
	expect(deadUpdate(5, 0)).toBe(5);
	expect(liveUpdate(2, [])).toEqual([0, 1]);
});

function afterLoop(n) {
	let i;
	for (i = 0; i < n; i++);
	return i;
}

function selfRead(n) {
	let j;
	for (j = () => j; n > 0; n--);
	return typeof j();
}

function deadZone(n) {
	let d;
	for (d = [d]; n > 0; n--);
	return d;
}

function asVar(n) {
	var k;
	for (k = 0; k < n; k++);
	return k;
}

it("should keep a `let` a loop assigns readable after it", () => {
	expect(afterLoop(4)).toBe(4);
	expect(afterLoop(0)).toBe(0);
	expect(selfRead(2)).toBe("function");
	expect(deadZone(1)).toEqual([undefined]);
	expect(asVar(3)).toBe(3);
});
