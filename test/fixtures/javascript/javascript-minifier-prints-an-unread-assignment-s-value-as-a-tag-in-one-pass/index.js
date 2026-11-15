function a() { var t; return (t = 2)`x`; }
function b() { var t; return (t = 1.5)`x`; }
function c() { var t; return (t = "s")`x`; }
function d() { var t; return (t = [])`x`; }
function e() { var t; g((t = 0.5)`x`); }
function g() {}
// A negative number stays wrapped: `-2` is no tag of its own.
function h() { var t; return (t = -2)`x`; }
// A member prints as `(0,t.f)`: bare, its object would be the tag's `this`.
function k(o) { var t; return (t = o.f)`x`; }
[a, b, c, d, e, h].forEach(function (f) {
	try {
		f();
	} catch (err) {
		console.log(f.name, err.constructor.name);
	}
});
console.log(k({ f: function () { return this === undefined || this === globalThis; } }));
