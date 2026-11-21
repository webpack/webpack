// A `var` read once, then only set with `=`, folds its value into that read,
// each write then printing its value alone.
var n = 0;
function next() {
	return ++n;
}
function log(value) {
	console.log(value);
}
function compared() {
	var value = next();
	value !== (value = next()) ? log("changed") : log("same");
}
compared();
function setAfter() {
	var value = next();
	log(value);
	value = next();
}
setAfter();
function* yielded() {
	var value = next();
	yield value;
	value = next();
}
console.log([].concat(Array.from(yielded())), n);
function updated() {
	var value = next();
	log(value);
	value++;
}
updated();
function readAgain() {
	var value = next();
	log(value);
	value = next();
	return value;
}
log(readAgain());
function closure() {
	var value = next();
	log(value);
	return function () {
		value = 7;
	};
}
closure()();
console.log(n);
