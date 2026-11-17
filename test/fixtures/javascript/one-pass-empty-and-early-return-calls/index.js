// A call of a declared function whose body runs nothing runs only its
// arguments; one that may have run something stays.
var log = [];
function empty() {}
empty();
empty(log.push("argument"));
console.log((empty(), !0), log.join());
function recurse(n) {
	return n > 0 ? recurse(n - 1) : n;
}
console.log(recurse(3));
// A function written where it is called, returning before what never runs,
// prints its statements in place of the call.
var result = "FAIL";
(function (unused) {
	result = "PASS";
	return;
	unused(result);
})();
console.log(result);
!(function () {
	log.push("ran");
	return;
	var hoisted;
	log.push(hoisted);
})();
console.log(log.join());
