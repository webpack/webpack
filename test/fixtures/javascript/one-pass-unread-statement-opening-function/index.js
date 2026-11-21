// A call printing as its one statement keeps the call where that statement
// opens with the function passed to it, which would print parenthesized.
var log = [];
function show(x) {
	log.push(x);
	return x;
}
function run() {
	(function (f) {
		f();
	})(function () {
		show("called");
	});
	show("after");
}
run();
run();
console.log(log.join());
