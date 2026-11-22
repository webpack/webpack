// An unread call of a function whose `var`s and `if`s run nothing goes.
var A = 1;
(function () {
	var b = typeof C !== "undefined";
	var c = 4;
	if (b) {
		return "yes";
	} else {
		return "no";
	}
})();
var held = {
	get x() {
		console.log("get");
		return 1;
	}
};
(function () {
	var b = held.x;
	if (b) return 2;
})();
(function () {
	if (held.x) return 2;
})();
try {
	(function () {
		var b = missing;
		return 1;
	})();
} catch (e) {
	console.log(e.name);
}
try {
	(function () {
		var { a } = null;
		return a;
	})();
} catch (e) {
	console.log(e.name);
}
var n = 0;
(function () {
	var b = n++;
	return b;
})();
console.log(n, A + 1);
