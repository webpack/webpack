function sink(value) {
	return typeof value;
}
function read(key) {
	var object = { x: 1, fn: function () {} };
	return [
		object.x,
		sink(object.fn),
		sink(object["fn"]),
		sink(object.fn),
		typeof object[key],
		object.x
	];
}
console.log(read("missing").join(","));
console.log(read("fn").join(","));
