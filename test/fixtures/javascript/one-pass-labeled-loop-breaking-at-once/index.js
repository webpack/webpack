var log = [];
function bar() {
	log.push("bar");
	return log.length < 3;
}
function run() {
	a: for (; bar(); ) break a;
	log.push("for");
	b: while (bar()) break b;
	log.push("while");
}
run();
console.log(log.join());
