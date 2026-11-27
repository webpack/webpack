type A = Obj['a'];

type B = Array<string>[number];

type C = Obj['bar'][foo]['boz'];

type D = (Obj['bar'])['baz'];

type E = Obj['bar'][];
