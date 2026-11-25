// A binding or a direct `eval` may hide `NaN` or `undefined`: their keys stay.
function hidden(NaN) {
	var p = {};
	p[NaN] = 1;
	p[0 / 0] = 2;
	return Object.keys(p).join();
}
console.log(hidden("x"));
function caught() {
	try {
		throw "y";
	} catch (undefined) {
		var q = {};
		q[undefined] = 1;
		return Object.keys(q).join();
	}
}
console.log(caught());
function evaluated(code) {
	var r = {};
	eval(code);
	r[Infinity] = 1;
	return Object.keys(r).join();
}
console.log(evaluated("var Infinity = 'z'"));
