// Not followed by `:`, so these are not arrow functions with invalid parameters
a ? (x, x) : c => d;
a ? async(x, x) : c => {};
a ? (b ? async(x, x) : c => d) : e;
o ? { y: a ? (x, x) : c => d } : e;
