var a = "FAIL";
try {
	throw 1;
} catch (r) {
	var a = "PASS";
}
console.log(a);

function loops(list) {
	var total = 0;
	for (var i = 0; i < list.length; i++) total += list[i];
	for (var i = 0; i < list.length; i++) total *= list[i];
	for (var key in { x: 1 }) total += key;
	for (var key in { y: 2 }) total += key;
	return total + i;
}
console.log(loops([1, 2, 3]));

function branches(flag) {
	var value = flag ? 1 : 2;
	if (flag) {
		var value = value + 10;
	}
	return value;
}
console.log(branches(true), branches(false));

function caught() {
	var e = 1;
	try {
		throw 2;
	} catch (e) {
		var e = 3;
		console.log(e);
	}
	return e;
}
console.log(caught());

function named() {
	var f = function () {};
	if (f) {
		var f = function () {};
	}
	return typeof f;
}
console.log(named());

function nested() {
	if (Math) {
		var n = 1;
	}
	var n = n + 1;
	return n;
}
console.log(nested());
