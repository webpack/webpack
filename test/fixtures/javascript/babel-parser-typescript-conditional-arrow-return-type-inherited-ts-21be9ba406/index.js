// Alternate of a conditional in a consequent
a ? b ? c : (d) : e => f;
// Right-hand side of an assignment
a ? b = (c) : d => e;
a ? b += (c) : d => e;
// Body of an arrow function that might be a parenthesized expression
a ? b => (c) : d => e;
a ? (b) => (c) : d => e;
a ? async (b) => (c) : d => e;
a ? ({ b }: T) => (c) : d => e;
a ? ([b]: T) => (c) : d => e;
