function block() {
	{
		first();
	}
	return 1;
}
function after() {
	first();
	{
		second();
	}
}
function kept() {
	if (1) {
		first();
	}
	return 2;
}
function finished() {
	try {
	} finally {
		first();
	}
	return 3;
}
function tested(options) {
	first();
	while (options.read) break;
	second();
}
function started(options) {
	first();
	for (second(); options.read; ) break;
	return 4;
}
function labeled() {
	first();
	outer: for (;;) break outer;
}
function scoped() {
	{
		let value = first();
		value();
	}
	second();
}
function first() {
	console.log("first");
	return function () {};
}
function second() {
	console.log("second");
}
console.log(block(), after(), kept(), finished(), tested({}), started({}), labeled(), scoped());
