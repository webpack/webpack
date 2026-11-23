// An update of a member of a parameter read first takes the argument there.
var obj = { o: { a: 1 } };
(function (o) {
	o.a++;
})(obj.o);
console.log(obj.o.a);
var log = [];
var held = {
	get o() {
		log.push("get");
		return this.inner;
	},
	inner: { a: 1 }
};
(function (o) {
	--o.a;
})(held.o);
console.log(log.join(), held.inner.a);
function reset() {
	obj.o = { a: 10 };
	return "a";
}
(function (o) {
	o[reset()]++;
})(obj.o);
console.log(obj.o.a);
function declared() {
	var b = obj.o;
	b.a++;
	console.log(b.a);
}
declared();
for (var i = 0; i < 2; i++)
	(function (o) {
		o.a++;
	})(obj.o);
console.log(obj.o.a);
(function (o) {
	arguments[0] = { a: 5 };
	o.a++;
	console.log(o.a);
})(obj.o);
console.log(obj.o.a);
