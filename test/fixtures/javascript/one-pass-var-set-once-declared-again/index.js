// A `var` set by one declarator, each other declaration setting nothing, folds into its one read.
function each(list) {
	var a;
	for (var key in list) {
		var a = key;
		console.log(a);
	}
}
function after(x) {
	var a = x + 1;
	var a;
	return a;
}
function twice(list) {
	var a = 1;
	for (var key in list) {
		var a = key;
		console.log(a);
	}
	return a;
}
each({ p: 1, q: 2 });
each({ r: 3 });
console.log(after(1), after(2), twice({ s: 4 }), twice({}));
