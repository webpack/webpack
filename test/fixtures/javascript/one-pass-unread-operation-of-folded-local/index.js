// An unread operation goes where the locals it reads fold to constants.
var log = [];
function use(value) {
	log.push(value);
}
function joined() {
	var x = 10;
	x + "0";
	++x;
	use(x);
}
function scaled() {
	var x = 10;
	x * 2;
	-x;
	x++;
	use(x);
}
function after() {
	var x = 1;
	use("call");
	x + "0";
	++x;
	use(x);
}
function converts(other) {
	var x = 10;
	x + other;
	++x;
	use(x);
}
function tests(other) {
	var x = "a";
	x in other;
	x += "b";
	use(x);
}
joined();
scaled();
after();
converts({ valueOf() { log.push("valueOf"); return 1; } });
tests({ a: 1 });
console.log(log);
