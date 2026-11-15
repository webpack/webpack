var result = [];
var named = function foo() { result.push(foo); };
[0, 1].map(() => named());
var bare = function () { result.push(1); };
[0, 1].map(() => bare());
