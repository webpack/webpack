// A `typeof` of a name set to an object or function nothing changes.
const obj = {};
if (typeof obj !== "undefined") console.log(typeof obj);
var fn = function () {
	console.log(count);
};
var count = 0;
count++ < 2 && "function" == typeof fn && fn();
count++ < 2 && "function" == typeof fn && fn();
function declared() {
	return 1;
}
console.log(typeof declared);
// Read before it is set, or written, its type is not known.
console.log(typeof later);
var later = [];
console.log(typeof later);
function changed() {}
console.log(typeof changed);
changed = 1;
console.log(typeof changed);
function early() {
	return typeof dead;
}
try {
	console.log(early());
} catch (e) {
	console.log(e.name);
}
const dead = /x/;
console.log(early(), typeof dead);
{
	function inBlock() {}
}
console.log(typeof inBlock);
