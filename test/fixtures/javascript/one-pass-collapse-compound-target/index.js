var count = 0;
var counted = {
	valueOf: function () {
		count++;
		return 4;
	}
};
function bits(c) {
	var b = 3 / c - 7;
	return log(c |= b);
}
function sum(c) {
	var b = 2;
	var a = 3 / c;
	return log(b += a);
}
function after(c) {
	var b = get();
	var a = 3 / c;
	return log(b += a);
}
function closed(c) {
	var set = function () {
		c = 100;
	};
	var b = (set(), 3);
	c += b;
	return c;
}
function written(c) {
	var b = ((c = 5), 3);
	c += b;
	return c;
}
function aliased(c) {
	var b = ((arguments[0] = 9), 2);
	c += b;
	return c;
}
function dead() {
	try {
		var b = get();
		x += b;
		let x = 1;
	} catch (e) {
		console.log(e.name);
	}
}
function looped(list) {
	var total = 0;
	for (var i = 0; i < list.length; i++) {
		var item = list[i] * 2;
		total += item;
	}
	return total;
}
function log(v) {
	console.log(v);
	return v;
}
function get() {
	console.log("get");
	return 1;
}
bits(2);
sum(3);
after(4);
console.log(bits(counted), count);
console.log(closed(1), written(1), aliased(1));
dead();
console.log(looped([1, 2, 3]));
