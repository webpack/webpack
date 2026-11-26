function last(node) {
	var next = function (item) {
		var data = item.data;
		return data && data.a != data.b;
	};
	while (next(node)) node = node.data;
	return node;
}
console.log(last({ a: 1, b: 2, data: { a: "hello" } }).a, last({ a: "world" }).a);

function count(list) {
	var size = function () {
		return list.length;
	};
	var i = 0;
	while (i < size()) i++;
	return i;
}
console.log(count([1, 2, 3]));

function grow(list) {
	var add = () => list.push(list.length);
	for (; list.length < 3; ) add();
	return list.join();
}
console.log(grow([]));

function constant(n) {
	var limit = 5;
	while (n < limit) n++;
	return n;
}
console.log(constant(1));

function apart(list) {
	var show = function (item) {
		console.log("item", item);
	};
	for (var i = 0; i < list.length; i++) show(list[i]);
}
apart([1, 2]);
