// An empty `try` goes though its `catch` declares its parameter's name with
// `var`, where nothing reads the name that declares outside the `catch`.
var a = 1;
!(function () {
	try {
		if (false) throw x;
	} catch (a) {
		var a = 2;
		console.log("FAIL");
	} finally {
		a = 3;
		console.log("PASS");
	}
})();
console.log(a);
function hoisted() {
	try {
	} catch (a) {
		var a = 2;
		var b = 1;
	}
	console.log(b);
}
hoisted();
function read() {
	try {
	} catch (a) {
		var a = 2;
	}
	return typeof a;
}
console.log(read());
function shadowed() {
	var a = 7;
	try {
	} catch (a) {
		var a = 2;
	}
	return a;
}
console.log(shadowed());
function captured() {
	try {
	} catch (a) {
		var a = 2;
	}
	return function () {
		return a;
	};
}
console.log(captured()());
