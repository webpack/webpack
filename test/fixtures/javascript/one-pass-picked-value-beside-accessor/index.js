// A value read off an object literal folds beside a getter or setter of another key.
var log = [];
var value = null;
({
	run: function (name) {
		log.push(name);
	},
	get value() {
		return value;
	},
	set value(next) {
		value = next;
	}
}).run("run");
log.push({ a: 1, get b() { throw new Error("b"); } }.a);
// One of the same key, or of a key computed by a call, keeps the literal.
log.push({ a: 1, set a(next) {} }.a);
log.push({ get a() { return 2; }, a: 3 }.a);
var keys = 0;
log.push({ a: 4, get [(keys++, "b")]() { return 5; } }.a, keys);
console.log(log);
