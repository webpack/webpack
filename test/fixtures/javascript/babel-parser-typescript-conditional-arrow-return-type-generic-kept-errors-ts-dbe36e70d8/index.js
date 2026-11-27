// Followed by `:`: keep the arrow function and its error
a ? <T>(x, x): U => d : e;
a ? <T>(x): U => { let y; let y; } : e;
// Not followed by `:`: the error is discarded when parsing again
a ? <T>(x, x) : U => d;
