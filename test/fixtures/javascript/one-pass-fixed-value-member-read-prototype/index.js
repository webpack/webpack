// A `__proto__` the program sets may hold a getter a read runs.
function prototype() {
	var o = {};
	o.__proto__ = {
		get b() {
			console.log("prototype getter");
		}
	};
	o.b;
	return o;
}
prototype();
