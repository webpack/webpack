var log = [];
Object.defineProperty(Object.prototype, "inherited", {
	configurable: true,
	get: function () {
		log.push("inherited getter");
	}
});
function make(value) {
	log.push("make");
	return value;
}
make({})?.inherited;
({ a: make(1) })?.inherited;
delete Object.prototype.inherited;
console.log(log.join());
