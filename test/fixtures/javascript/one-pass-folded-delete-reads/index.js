// A `delete` folding to its value reads nothing its operand names.
function f() {}
console.log(delete (f(), undefined));
console.log(delete (f(), void 0));
console.log(delete (f(), 1 / 0));
function m() {}
console.log(!delete (m(), 1), typeof delete (m(), 1), [delete (m(), 0)]);
function k() {}
var t = delete (k(), 1) ? "y" : "n";
console.log(t);
// What runs, or a member, keeps it.
function g() {
	console.log("g");
}
console.log(delete (g(), 1));
var obj = { p: 1 };
function h() {}
console.log(delete (h(), obj).p, obj);
