// `new` of a call printing as the function or class it returns takes it bare.
var made = new (function (a) { return function Made() { this.a = a; }; }(7))();
console.log(made.a);
console.log(new (function () { return function () { this.b = 2; }; }())().b);
console.log(new (function () { return class { constructor(c) { this.c = c; } }; }())(3).c);
console.log(new (function () { return function (d) { this.d = d; }; }())(4).d);
