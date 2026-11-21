// A loop whose body leaves it the first time it runs does nothing, so a
// function holding only that does nothing when called.
var count = 0;
function tick() {
	count++;
	return 1;
}
function outer() {
	function inner() {
		L: for (;;) break L;
	}
	inner();
}
outer();
(function () {
	while (1) {
		break;
	}
})();
(function () {
	L: do {
		break L;
	} while (tick());
})();
console.log(
	(function () {
		for (;;) break;
	})(),
	count
);
// Each of these runs something, or does not leave at once.
console.log(
	(function () {
		for (; tick(); ) break;
	})(),
	count
);
console.log(
	(function () {
		M: {
			L: for (;;) break M;
			tick();
		}
	})(),
	count
);
console.log(
	(function () {
		for (var i = tick(); ; ) break;
	})(),
	count
);
console.log(
	(function () {
		do continue;
		while (count++ < 3);
	})(),
	count
);
console.log(
	(function* () {
		for (;;) break;
	})().next().done,
	count
);
