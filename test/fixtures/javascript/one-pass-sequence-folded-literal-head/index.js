function show(value) {
	console.log(typeof value === "function" ? "function" : value);
	return value;
}
var copy = (1, { value: show }.value);
show((1, { value: 2 }.value));
show((2, [copy][0]));
console.log(typeof copy);
