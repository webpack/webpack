var log = [];
function a() { log.push("a"); return 1; }
function b() { log.push("b"); }
console.log(function () { return 6; }(a(), b()));
console.log((() => "x")(a()));
console.log(function (x, y) { return true; }(a(), b()));
var r = (() => null)(b());
console.log(r, log.join());
console.log(function (x) { return x; }(a()));
console.log(function () { return 6; }(...[a()]));
console.log((async () => 1)(a()) instanceof Promise);
console.log(function () { return arguments.length; }(a(), b()));
console.log((b(), (() => 7)(a())), log.length);
var s = (((x) => 8)(a()), b());
console.log(s);
