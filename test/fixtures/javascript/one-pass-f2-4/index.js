class A { constructor() {} m() {} }
class B { constructor(...args) {} }
class C { constructor() { ; } }
class D extends A { constructor() {} }
class E { constructor(a) {} }
class F { constructor() { g(); } }
class G { constructor(...[a]) {} }
class H { static constructor() {} }
out.l = [A, B, C, D, E, F, G, H];
