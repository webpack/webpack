var count = 0;
function step() {
	count++;
}
function plain(flag) {
	if ((step(), flag)) return "yes" + count;
	return "no" + count;
}
function negated(flag) {
	if ((step(), !flag)) return "yes" + count;
	return "no" + count;
}
function thrown(flag) {
	if ((step(), !flag.on)) throw "yes" + count;
	throw "no" + count;
}
function statement(flag) {
	if ((step(), !flag)) count = 10;
	else count = 20;
	console.log(count);
}
console.log(plain(0), plain(1), negated(0), negated(1));
[{ on: 0 }, { on: 1 }].forEach(function (flag) {
	try {
		thrown(flag);
	} catch (error) {
		console.log(error);
	}
});
statement(0);
statement(1);
function both(flag) {
	if ((step(), !flag)) console.log("yes" + count);
	else console.info("no" + count);
}
both(0);
both(1);
