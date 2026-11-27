// A built-in call folds where its arguments spread an array literal written in place.
console.log((1.23).toExponential(...[]));
console.log((1.23).toExponential(...[undefined]));
console.log((1.23).toPrecision(...[...[undefined]]));
console.log((255).toString(...[16]));
console.log((1.5).toString(undefined), (1.5).toString(...[void 0]));
console.log("abc".indexOf(...["c"], ...[]));
console.log(Math.max(...[1, 2], 3));
// A hole, a name or parentheses still spread as written.
console.log(Math.max(...[1, , 2]));
var list = [4, 5];
console.log(Math.max(...list));
console.log(Math.max(...([6, 7])));
