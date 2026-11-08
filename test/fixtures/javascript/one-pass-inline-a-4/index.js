var e = Math.round(f());
console.log(e);
function f() {
	console.log = function () {};
	return 1;
}
