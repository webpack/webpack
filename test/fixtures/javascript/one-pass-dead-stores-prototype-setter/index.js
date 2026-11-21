// A setter the program itself puts on `Object.prototype` runs for a store on
// a fresh literal, so the store stays.
var hits = 0;
Object.defineProperty(Object.prototype, "x", {
	set() {
		hits++;
	},
	configurable: true
});
({}).x = 1;
(function () {}).x = 2;
console.log(hits);
delete Object.prototype.x;
