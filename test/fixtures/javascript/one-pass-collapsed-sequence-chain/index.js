var store = { a: 1, b: { c: 2 } };
function make() {
	return store;
}
function first(skip) {
	console.log(
		(function (value) {
			return value.a;
		})((skip, make()))
	);
}
function whole(skip) {
	console.log(
		(function (value) {
			return value;
		})((skip, store.b))
	);
}
function deep(skip) {
	console.log(
		(function (value) {
			return value.b.c + 1;
		})((skip, make()))
	);
}
first(1);
whole(2);
deep(3);
