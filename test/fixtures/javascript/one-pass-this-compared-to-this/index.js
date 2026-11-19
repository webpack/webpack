// `this` is one value of one type, which `==` compares as `===` does.
var o = {
	u: function () {
		return this === this;
	},
	v: function () {
		return this !== this;
	}
};
console.log(o.u(), o.v());
console.log(o.u.call(1), o.v.call("a"), o.u.call(undefined));
