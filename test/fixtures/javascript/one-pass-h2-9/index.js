Array.prototype.join = function () { return "patched"; };
function f(x) { return [+x, "a"].join(""); }
console.log(f(1));
