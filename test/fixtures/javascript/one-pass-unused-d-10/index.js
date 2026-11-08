(() => eval)()(x);
y = (function () { return eval; })();
z = (() => eval(x))();
