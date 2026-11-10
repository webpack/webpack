(true ? {} : []).foo = 2;
x = (1 ? {} : []).foo;
v = (1 ? function () { return this; } : 0)();
f(() => 1 ? {} : 1);
f(() => (1 ? {} : 1).x);
y = 1, (1 ? {} : []).foo = 2;
z = (1 ? class {} : 2).w;
