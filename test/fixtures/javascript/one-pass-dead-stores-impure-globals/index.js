// Under `pristineGlobals: false` a store on a fresh literal may run a setter
// a polyfill put on `Object.prototype`, so it stays.
var hits = 0;
Object.defineProperty(Object.prototype, "polyfilled", {
	set() {
		hits++;
	},
	configurable: true
});
function store() {
	({}).polyfilled = 1;
	var fresh = {};
	fresh.polyfilled = 2;
	return hits;
}
console.log(store());
delete Object.prototype.polyfilled;
