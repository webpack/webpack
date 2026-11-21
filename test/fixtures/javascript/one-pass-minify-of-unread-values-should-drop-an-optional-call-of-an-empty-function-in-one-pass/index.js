var x = 1;
(() => {})?.(x);
(() => {})?.(x, console.log("a"), console.log("b"));
(function () {})?.(console.log("c"));
console.log(x);
