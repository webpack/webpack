function bar() { return 1; }
var foo = console.log, x = 2, c = 3;
foo(bar() + (1 + "a") + "b", bar() + "a" + (2 + 3), x + 1 + (1 + 2) + "b", bar() + "a" + ("b" + c));
