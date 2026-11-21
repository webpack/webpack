function plain() {
	var t = (console.log("ran"), 4);
	return [t, t + t];
}
function pair() {
	var n = 0,
		t = ((n = 2), 4);
	return n + t;
}
function early() {
	function k() {
		return t;
	}
	var t = (console.log(k()), 4);
	return [t, k()];
}
function hoisted() {
	var t = (h(), 4);
	return t + 1;
	function h() {
		console.log("in", t);
	}
}
function zone() {
	let t = (f(), 1);
	function f() {
		try {
			console.log(t);
		} catch (e) {
			console.log("tdz");
		}
	}
	return t + t;
}
function loop() {
	for (var i = 0; i < 2; i++) {
		var t = (console.log(i), 5);
	}
	return t;
}
function branch(c) {
	if (c) var t = (console.log("c"), 1);
	return t;
}
var out = [];
let list = (out.push(0), 1);
console.log(plain(), pair(), early(), hoisted(), zone());
console.log(loop(), branch(0), branch(1), list + list, out);
