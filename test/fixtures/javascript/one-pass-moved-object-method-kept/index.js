// A moved literal keeps its call where printing could not read the key again,
// or where the literal holds a comment kept.
function computed() {
	let key = "p";
	key;
	var o = { p: function () { return 1; } };
	return o[key]();
}
console.log(computed());
function commented() {
	var o = { other: /*! @license example */ 0, p: function () { return 2; } };
	return o.p();
}
console.log(commented());
