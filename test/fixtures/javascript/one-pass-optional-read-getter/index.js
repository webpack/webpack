// Under `pure_getters: false`, a read `?.` skips on `null` may still run a
// getter on what it reads: it stays, as a plain read does.
var log = [];
function read(object) {
	object?.first;
	object?.["second"];
	object?.first.length;
	return 1;
}
read({
	get first() {
		log.push("first");
		return "";
	},
	get second() {
		log.push("second");
	}
});
read(null);
console.log(log.join());
