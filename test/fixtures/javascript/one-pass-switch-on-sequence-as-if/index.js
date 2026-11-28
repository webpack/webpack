// A `switch` of one case on a sequence compares its last item: as an
// `if`, `a,b===t` runs `a` first, the comma binding loosest.
function run(label) {
	console.log(label);
	return label;
}
function first(value) {
	switch ((run("lead"), value)) {
		case 1:
			run("one");
	}
}
function assigned(value) {
	var unused;
	switch (((unused = 2), value)) {
		case run("test"):
			run("matched");
	}
	return "assigned";
}
first(1);
first(2);
console.log(assigned("test"), assigned("other"));
