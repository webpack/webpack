// A setter the program puts on `Function.prototype` runs for a store on a
// fresh function or arrow, so the store stays.
var hits = 0;
Object.defineProperty(Function.prototype, "y", {
	set(value) {
		hits += value;
	},
	configurable: true
});
(function () {}).y = 2;
(() => 0).y = 3;
Object.defineProperty(Function["prototype"], "z", {
	set(value) {
		hits += value;
	},
	configurable: true
});
(function () {}).z = 4;
console.log(hits);
delete Function.prototype.y;
delete Function.prototype.z;
