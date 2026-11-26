// A string's length or code unit read off a call printing as that string folds.
var seen = [];
function f(v) {
	seen.push(v);
	return v;
}
function name() {
	return "abc";
}
console.log(function () { return "ab"; }().length, (() => "xyz")()[1], name().length);
console.log(function (a) { return "ab"; }(f(1)).length);
console.log(function () { f(2); return "ab"; }().length, seen);
