// A call of a function returning a name read as a constant prints that constant.
var greeting = "PASS";
function read() {
	return greeting;
}
(function () {
	var greeting = "FAIL";
	console.log(read(), greeting);
})();
var count = 7;
function many() {
	return count;
}
(function () {
	var count = 0;
	console.log(many(), many(), many(), many(), count);
})();
// Read before its `var` is set, the name stays.
function early() {
	return late;
}
function caller() {
	var late = "inner";
	return early() + late;
}
console.log(caller());
var late = "set";
console.log(caller());
var written = 1;
function changing() {
	return written;
}
(function () {
	var written = 2;
	console.log(changing(), written);
})();
written = 3;
console.log(changing());
