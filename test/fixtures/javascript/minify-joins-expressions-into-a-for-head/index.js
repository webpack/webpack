function joined(options) {
	first();
	second();
	for (; options.count < 2; ) options.count++;
	return options.count;
}
function started(options) {
	first();
	for (second(); options.count < 3; ) options.count++;
	return options.count;
}
function dropped(options) {
	first();
	for (var unused = 0; options.count < 4; ) options.count++;
	return options.count;
}
function apart(options) {
	first("in");
	second();
	for (; options.count < 5; ) options.count++;
	return options.count;
}
function first(value) {
	console.log("first", value);
}
function second() {
	console.log("second");
}
console.log(joined({ count: 0 }), started({ count: 0 }), dropped({ count: 0 }), apart({ count: 0 }));
