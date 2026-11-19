function run() {
	var self = this;
	if (self.count++) self.foo();
	else self.bar();
}
function arrows() {
	var that = this;
	return [1, 2].map(function () {
		return that.base;
	});
}
function lexical() {
	var that = this;
	return [1, 2].map((n) => that.base + n);
}
function shorthand() {
	var self = this;
	return { self: self, again: { self } };
}
function deleted() {
	var self = this;
	return [delete self, self.base];
}
function called() {
	return (function () {
		var self = this;
		return self;
	})();
}
var o = {
	count: 0,
	base: 10,
	foo: function () {
		console.log("foo");
	},
	bar: function () {
		console.log("bar");
	}
};
run.call(o);
run.call(o);
console.log(arrows.call(o), lexical.call(o));
console.log(shorthand.call(o).again.self === o, deleted.call(o));
console.log(called.call(o) === o);
