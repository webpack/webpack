var log = [];
function first(x) {
	if (x) {
	}
	log.push("first", x);
}
function second(x) {
	var y = x;
	log.push("second", y);
}
first(1);
second(2);
console.log(log.join());
