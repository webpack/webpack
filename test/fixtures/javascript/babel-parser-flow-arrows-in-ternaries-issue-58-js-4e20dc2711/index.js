// Valid lhs value inside parentheses
a ? (b) : c => d; // a ? b : (c => d)
a ? (b) : c => d : e; // a ? ((b): c => d) : e
a ? (b) : (c) : d => e; // a ? b : ((c): d => e)

// Nested arrow function inside parentheses
a ? (b = (c) => d) : e => f; // a ? (b = (c) => d) : (e => f)
a ? (b = (c) => d) : e => f : g; // a ? ((b = (c) => d): e => f) : g

// Nested conditional expressions
    b ? c ? (d) : e => (f) : g : h; // b ? (c ? ((d): e => f) : g) : h
a ? b ? c ? (d) : e => (f) : g : h; // a ? (b ? (c ? d : (e => f)) : g) : h

a ? b ? (c) : (d) : (e) => f : g; // a ? (b ? c : ((d): e => f)) : g

// Multiple arrow functions
a ? (b) : c => d : (e) : f => g; // a ? ((b): c => d) : ((e): f => g)

// Multiple nested arrow functions (<T> is needed to avoid ambiguities)
a ? (b) : c => (d) : e => f : g; // a ? ((b): c => ((d): e => f)) : g
a ? (b) : c => <T>(d) : e => f; // a ? b : (c => (<T>(d): e => f))
a ? <T>(b) : c => (d) : e => f; // a ? (<T>(b): c => d) : (e => f)

// Invalid lhs value inside parentheses
a ? (b => c) : d => e; // a ? (b => c) : (d => e)
a ? b ? (c => d) : e => f : g; // a ? (b ? (c => d) : (e => f)) : g

// Invalid lhs value inside parentheses inside arrow function
a ? (b) : c => (d => e) : f => g; // a ? ((b): c => (d => e)) : (f => g)
a ? b ? (c => d) : e => (f => g) : h => i; // a ? (b ? (c => d) : (e => (f => g))) : (h => i)

// Function as type annotation
a ? (b) : (c => d) => e : f; // a ? ((b): (c => d) => e) : f

// Async functions or calls
a ? async (b) : c => d; // a ? (async(b)) : (c => d)
a ? async (b) : c => d : e; // a ? (async (b): c => d) : e
a ? async (b => c) : d => e; // a ? (async(b => c)) : (d => e)
a ? async (b) => (c => d) : e => f; // a ? (async (b) => c => d) : (e => f)

// https://github.com/prettier/prettier/issues/2194
let icecream = what == "cone"
  ? p => (!!p ? `here's your ${p} cone` : `just the empty cone for you`)
  : p => `here's your ${p} ${what}`;
