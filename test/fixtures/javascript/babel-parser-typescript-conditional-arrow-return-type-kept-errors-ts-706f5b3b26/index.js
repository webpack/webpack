// Followed by `:`: keep the arrow function and its error
a ? (x) : c => { let x; } : e;
a ? async(x) : c => { let x; } : e;
a ? (x = 1) : c => { "use strict"; } : e;
// Not followed by `:`: the error is discarded when parsing again
a ? (x) : c => { let x; };
