// A call printing as what its function runs, then returns, prints that
// sequence bare as a `for`-`in`'s object, in parentheses as a `for`-`of`'s.
var seen = [];
function make(object) {
	seen.push("made");
	return object;
}
for (var key in make({ a: 1 })) seen.push(key);
function list(array) {
	seen.push("listed");
	return array;
}
for (var item of list([2])) seen.push(item);
function pick(object) {
	seen.push("picked");
	return object;
}
for (var name in pick({ b: 1 }) ? { c: 1 } : {}) seen.push(name);
console.log(seen.join());
