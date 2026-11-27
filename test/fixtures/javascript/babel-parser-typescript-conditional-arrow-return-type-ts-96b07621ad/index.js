// Not followed by `:`: the `:` is the conditional's separator
a ? (b) : c => d;
a ? async(b) : c => d;
a ? ({ b }) : c => d;

// Followed by `:`: the arrow function has a return type
a ? (b) : c => d : e;
a ? async (b) : c => d : e;
a ? ({ b }) : c => d : e;
a ? (b: B): c => d : e;
