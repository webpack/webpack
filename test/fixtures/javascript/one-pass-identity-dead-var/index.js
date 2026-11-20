var id = function (x) {
	return x;
	var x;
};
function same(y) {
	return y;
	var y, z;
}
function first(a) {
	return a;
	var a;
	var a;
}
console.log(id(1), id("two"), same(3), same(true), first(5), first(6));
