var e = [];
function a(i) {
	e.push("a" + i);
}
function b(i) {
	e.push("b" + i);
}
for (var i = 0; i < 2; i++) {
	do {
		a(i);
		continue;
	} while (false);
	b(i);
}
for (var j = 0; j < 2; j++) {
	do {
		a(j);
		break;
	} while (false);
	b(j);
}
for (var k = 0; k < 2; k++) {
	{
		a(k);
	}
	b(k);
}
if (e.length) {
	do {
		a(9);
	} while (0);
	b(9);
} else b(8);
for (var m = 0; m < 2; m++) {
	do {
		if (m) break;
		break;
	} while (false);
	e.push("t");
}
console.log(e.join());
for (var n = 0; n < 2; n++) {
	inner: do {
		e.push("l" + n);
		break inner;
	} while (false);
	outer: do {
		e.push("c" + n);
		continue outer;
	} while (false);
	e.push("r" + n);
}
for (var p = 0; p < 2; p++) {
	label: do {
		for (;;) {
			if (p) break label;
			break;
		}
		e.push("in");
	} while (false);
	e.push("s");
}
console.log(e.join());
