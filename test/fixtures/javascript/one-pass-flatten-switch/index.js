var log = [];
function f(v) {
	log.push(v);
	return v;
}
var a = 1,
	b = 2;
switch (a--) {
	default:
		b++;
}
console.log(a, b);
switch (f(1)) {
}
switch (f(2)) {
	default:
}
switch (1) {
	case 1:
		f(3);
		break;
	case 2:
		var v = 4;
}
console.log(v);
switch ("a") {
	case "a":
		f(5);
	default:
		f(6);
}
function g() {
	switch (1) {
		case 1:
			return f(7);
		default:
			var r;
	}
}
console.log(g());
switch (f(8)) {
	default:
		let y = 9;
		f(y);
}
switch (1) {
	case 1:
		f(10);
		if (log.length > 2) break;
		f(11);
}
L: {
	switch (1) {
		case 1:
			f(12);
			break L;
	}
	f(13);
}
for (var k = 0; k < 2; k++) {
	switch (1) {
		case 1:
			f(14);
			continue;
	}
	f(15);
}
switch (1) {
	case 1:
		f(16);
		break;
	default:
		function q() {}
}
function d() {
	switch (1) {
		case 1:
			"use strict";
			f(17);
	}
	return this === undefined;
}
console.log(d());
switch (1) {
	case "1":
		f(18);
}
switch (1) {
	case 1:
		var w = f(19);
		break;
	case 2:
		var w = 20;
}
switch ((1)) {
	case 1:
		f(21);
}
switch (f(22)) {
	default:
		f(23);
	case 22:
		f(24);
}
switch (f(25)) {
	case 1:
		f(26);
}
switch (1) {
	case 1:
		// kept
		f(27);
}
var c;
switch ((c = 2)) {
	case 1:
		f(28);
	case 2:
		f(29);
	case 3:
		f(30);
		break;
	case 4:
		f(31);
}
switch ((f(32), 3)) {
	case 1:
		f(33);
		break;
	case 3:
		f(34);
}
switch (5) {
	case 1:
		f(35);
	default:
		f(36);
	case 2:
		f(37);
}
switch (1) {
	default:
		f(38);
	case 1:
		f(39);
}
switch (9) {
	case 1:
		let n = 1;
		f(n);
}
switch (9) {
	case 9:
		f(40);
	case 1:
		let m = 1;
}
switch (7) {
	case 1:
		var u = 1;
		f(41);
}
console.log(c, u);
console.log(w, log.join(","));
