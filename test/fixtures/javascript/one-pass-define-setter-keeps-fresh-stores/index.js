// A setter `__defineSetter__` puts on `Object.prototype` runs on each store
// to a fresh literal, which then stays.
Object.prototype.__defineSetter__("seen", function (value) {
	console.log("set", value);
});
({}).seen = 1;
[].seen = 2;
(function () {}).prototype.seen = 3;
console.log(({}.seen = 4, 5));
({}).other = 6;
console.log("done");
