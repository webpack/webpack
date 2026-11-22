var log = console.log;
function run(factory) {
	factory();
	log("after");
}
run(function () {
	return (function (fn) {
		fn();
	})(function () {
		return 1;
	});
});
function call(f) {
	f();
}
try {
	call(function () {
		return (function (fn) {
			fn();
		})(function () {
			throw "thrown";
		});
	});
} catch (e) {
	log("caught", e);
}
