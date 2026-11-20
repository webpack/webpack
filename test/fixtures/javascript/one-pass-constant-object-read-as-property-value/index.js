// A constant object's member read as a property's value prints its value;
// one a pattern sets keeps the object.
function read() {
	var o = { a: 1, b: 2 };
	return { x: o.a, y: o.b };
}
console.log(JSON.stringify(read()));
function computed() {
	var o = { a: 1, b: "k" };
	var r = { [o.b]: o.a };
	return JSON.stringify(r);
}
console.log(computed());
function set(v) {
	var o = { a: 1, b: 2 };
	var r = { x: o.a };
	({ y: o.a } = v);
	return r.x + o.a;
}
console.log(set({ y: 5 }));
function nested(v) {
	var o = { a: 1 };
	({ x: { y: o.a } } = v);
	return o.a;
}
console.log(nested({ x: { y: 7 } }));
function looped(list) {
	var o = { a: 1 };
	for ({ x: o.a } of list);
	return o.a;
}
console.log(looped([{ x: 3 }, { x: 4 }]));
