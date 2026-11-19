// An assignment of a name or a member folds into its one read as the value.
function named(x, y) {
	var a, r = x + y;
	a = r;
	return a + 7;
}
console.log([1, 2].map(named));
function member(o) {
	var a;
	a = o.v;
	return a + 1;
}
console.log([{ v: 1 }, { v: 2 }].map(member));
// Called, a member keeps reading `this` as a value; `typeof` and `eval` keep
// how they read it.
var box = {
	v: 3,
	get: function () {
		return this === box ? "this" : "value";
	}
};
function called(o) {
	var a;
	a = o.get;
	return a();
}
console.log([box, box].map(called));
function typed(flag) {
	var a;
	try {
		a = flag ? box : missing;
		return typeof a;
	} catch (e) {
		return e.name;
	}
}
console.log([0, 1].map(typed));
function evaluated(s) {
	var s2 = "inner", a;
	a = eval;
	return a(s) + s2;
}
console.log(["typeof s2", "typeof s2"].map(evaluated));
