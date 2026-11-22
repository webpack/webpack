var e = [];
function f1(x) {
	do {
		e.push("a");
		return 1;
	} while (0);
	e.push("dead");
	return 2;
}
function f2(x) {
	do {
		if (x) continue;
		return 1;
	} while (0);
	return 2;
}
function f3(x) {
	l: {
		if (x) break l;
		return 1;
	}
	return 2;
}
function f4(x) {
	l: {
		return 1;
	}
	return 2;
}
function f5(x) {
	switch (x) {
		case 1:
			e.push("one");
		default:
			return 3;
	}
	return 4;
}
function f6(x) {
	switch (x) {
		case 1:
			break;
		default:
			return 3;
	}
	return 4;
}
function f7(x) {
	switch (x) {
		default:
			return 3;
		case 2:
	}
	return 4;
}
function f8() {
	do {
		return typeof hoisted;
	} while (0);
	var hoisted = 1;
}
console.log(f1(), f2(1), f2(0), f3(1), f3(0), f4(), f5(1), f5(2), f6(1), f6(2));
console.log(f7(1), f7(2), f8(), e.join());
