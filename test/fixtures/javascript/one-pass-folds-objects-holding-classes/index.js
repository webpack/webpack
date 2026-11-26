// A constant read off an object holding a class made running nothing folds.
var shapes = { Box: class { constructor(n) { this.n = n; } }, size: 2, name: "box" };
console.log(new shapes.Box(shapes.size).n, shapes.name, typeof shapes.Box);
// A class made running code keeps its object as written.
function key() { console.log("made"); return "m"; }
var made = { Logged: class { [key()]() {} }, size: 3 };
console.log(made.size);
function nested() {
	var o = { K: class extends Object {}, x: 1 };
	return o.x + (new o.K() instanceof Object ? 1 : 0);
}
console.log(nested());
