// Followed by `:`: keep the arrow function and its error
a ? (b, b): c => d : e;
// Not followed by `:`: the error is discarded when parsing again
a ? (b, b) : c => d;
