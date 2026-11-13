var copied = {};
function Shape() {
	this.points = null;
}
Shape.prototype.copy = function (source) {
	console.log("copy");
	if (source.points !== undefined) this.points = source.n;
	else this.points = source.s;
	return this;
};
function store(key, value) {
	if (value) copied.value = value;
	else copied.value = key;
}
function apart(key, value) {
	if (value) copied.value = value;
	else copied.other = key;
	if (value) copied.value += value;
	else copied.value += key;
}
var shape = new Shape().copy({ points: [1, 2], n: 2 });
console.log(shape.points, new Shape().copy({ s: 3 }).points);
store("key", 0);
console.log(copied.value);
store("key", "value");
apart("a", "b");
console.log(copied.value, copied.other);
