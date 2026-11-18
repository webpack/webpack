var shapes = {
	sides: 4,
	square: function (x) {
		return x * x;
	},
	cube: function (x) {
		return x * x * x;
	}
};
console.log(shapes.sides, shapes.cube(3));
var ops = {
	p: 1,
	"+": function (x) {
		return x;
	},
	"-": (x) => x + 1
};
console.log(ops.p === ops.p, ops["+"](4), ops["-"](5));
var loops = {
	n: 2,
	run: function (x) {
		for (var i = 0; i < x; i++) console.log("loop", i);
	}
};
loops.run(2);
console.log(loops.n);
var self = {
	k: 7,
	get: function () {
		return this.k;
	}
};
console.log(self.get(), self.k);
var twice = {
	a: 1,
	f: function (x) {
		return x * 2;
	}
};
console.log(twice.f(3), twice.f(4), twice.a);
var written = {
	a: 1,
	f: function (x) {
		return x * 2;
	}
};
console.log(written.f(3), written.a);
written.b = 2;
function helper(v) {
	return v + 1;
}
var free = {
	a: 1,
	f: function (x) {
		return helper(x);
	}
};
console.log(free.f(1), free.a, helper(2));
function nested() {
	var local = {
		a: 1,
		f: function (x) {
			return [x, Math.max(x, 9)];
		}
	};
	return [local.a, local.f(2)];
}
console.log(nested(), nested());
