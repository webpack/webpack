out.t = new (function () { eval("this.n = arguments.length"); })(1, 2);
out.c = new (class { constructor() { eval("this.n = arguments.length"); } })(1, 2);
