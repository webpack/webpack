// A function's own `length` counts its parameters before a default or rest.
console.log(function (a, b) {}.length);
console.log((() => {}).length, function (a, b = 1, c) {}.length);
console.log(function (a, ...rest) {}.length, function ({ a }, [b]) {}.length);
function once(a, b, c) {}
console.log(once.length);
console.log(
	(function f(a) {
		function f() {}
		return f.length;
	})()
);
// Read twice, redefined or a class's, it stays a read.
function twice(a) {}
console.log(twice.length, twice.length);
function defined(a) {}
Object.defineProperty(defined, "length", { value: 7 });
console.log(defined.length);
console.log(class {
	constructor(a) {}
}.length);
console.log(delete function () {}.length);
