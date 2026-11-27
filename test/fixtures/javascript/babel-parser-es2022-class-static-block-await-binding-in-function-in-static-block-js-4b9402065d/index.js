var C;

C = class { static { function f() { await } } };

C = class { static { function f(await) {} } };

C = class { static { function f(x = await) {} } };

C = class { static { function f({ [await]: x }) {} } };
// await in function expression is allowed
C = class { static { (function await() {}) } };
