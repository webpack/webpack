function fn() {}
var object = {};
var list = [];
console.log(fn != fn, object === object, list == list, fn !== fn);
var kept = {};
console.log(kept === kept, kept);
var later = {};
function setLater() {
	later = NaN;
}
setLater();
console.log(later === later);
try {
	console.log(early === early);
} catch (e) {
	console.log("dead zone");
}
let early = {};
