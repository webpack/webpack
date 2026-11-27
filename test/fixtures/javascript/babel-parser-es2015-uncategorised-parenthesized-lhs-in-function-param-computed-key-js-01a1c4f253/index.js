function f1({ [(a) = 1]: x }) {}
function f2([{ [(a) = 1]: x }], ...{ [(a) = 1]: y }) {}
(function ({ [(a) = 1]: x } = {}) {});
({ m({ [(a) = 1]: x }) {} });
class A { m({ [(a) = 1]: x }) {} }
