// Not followed by `:`, so these errors are discarded when parsing again
a ? (x) : c => { let x; };
a ? async(x) : c => { let x; };
a ? (x = 1) : c => { "use strict"; };
// Invalid parameters, so these are never arrow functions
a ? ([(x)]) : c => d;
a ? b ? ([(x)]) : c => d : e;
a ? b ? async(1) : c => { "use strict"; } : e;
a ? b ? async(x, x, 1) : c => d : e;
