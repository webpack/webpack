// A loop whose test is known false runs its start and test alone, a `var`
// declaring the names its body declares, a `while` as a `for`.
var log = [];
function run() {
	log.push("run");
	return 0;
}
while (0) {
	log.push("never");
	var first = 1;
}
console.log(first);
while ((run(), 0)) {
	log.push("never");
	var second = 2;
}
console.log(second, log.join());
for (var index = 1, other; index && (other || index) && 0; ++index) {
	log.push("never");
	var third = 3;
}
console.log(index, other, third);
outer: for (; run() && 0; ) {
	var fourth = 4;
	break outer;
}
console.log(fourth, log.join());
inner: while (run() && 0) {
	var fifth = 5;
	break inner;
}
console.log(fifth, log.join());
function scoped() {
	while (!(log.length + "0")) {
		var sixth = 6;
	}
	return typeof sixth;
}
console.log(scoped());
while (0) var unread = 7;
console.log("done");
