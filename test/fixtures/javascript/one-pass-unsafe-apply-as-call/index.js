var values = [2, 3];
function show() {
	console.log(this && this.name, Array.prototype.slice.call(arguments));
}
var owner = { name: "owner", show: show };
show.apply(owner, [1, 2]);
show.apply(owner, []);
show.apply(owner, [1, ...values, 4]);
show.apply(owner, values);
show.apply(owner, [1, , 3]);
owner.show.apply(null, [typeof function () {}, { a: 1 }.a]);
console.log.apply(console, [1, ...[2, 3], 4]);
