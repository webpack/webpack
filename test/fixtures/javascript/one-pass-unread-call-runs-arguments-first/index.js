// A call nothing reads, passing values its function never reads, prints
// what it passes, then what the function runs.
var log = [];
function id(value) {
	log.push("id " + value);
	return value;
}
(function (unused) {
	const result = log.push("body");
	unused && unused[result];
})(id(null));
(function (a, b) {
	log.push("two");
})(id(1), id(2));
(function (a) {
	if (log.length > 100) return;
	log.push("tested");
})(id(3));
((a) => {
	const r = id(4);
	log.push(r);
})(id(5));
(function (a) {
	log.push("pure");
})(6);
(function (x) {
	var a = "GOOD" + x,
		e = "BAD",
		k = "!",
		e = a;
	log.push(e + k);
})("!");
(function (a) {
	var unused;
	log.push("late");
	unused = 2;
})(id(7));
console.log(log.join());
