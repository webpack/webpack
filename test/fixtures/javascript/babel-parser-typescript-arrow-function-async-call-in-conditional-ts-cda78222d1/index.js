// https://github.com/babel/babel/issues/17547
// `async(a)` in a ternary consequent followed by `:` should be
// parsed as a call expression, not as an async arrow with return type.
true ? async(a) : b => b;
let _ = true ? async(a) : b => b;

// Parenthesized async arrow with return type should still work
// inside a ternary consequent.
let x = true ? (async (a): b => a) : 1;
