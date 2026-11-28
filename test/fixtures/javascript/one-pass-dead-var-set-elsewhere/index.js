// Dead code declaring a `var` that elsewhere is only set goes with the sets.
function loop(list) {
	if (0) for (var item of list);
	item = 1;
	while (0) for (var key in list);
	key = list;
	return "loop";
}
function value(list) {
	if (0) {
		var total = 5;
		for (;;);
	}
	total = run("value");
	return total === undefined;
}
// A read, a compound write or a destructuring keeps the declaration.
function read(list) {
	if (0) for (var item of list);
	item = 1;
	return item;
}
function compound() {
	if (0) for (var count of []);
	count += 1;
	return count;
}
function pattern() {
	if (0) for (var first of []);
	[first] = [2];
	return typeof first;
}
function run(label) {
	console.log(label);
}
console.log(loop([1]), value([]), read([]), compound(), pattern());
