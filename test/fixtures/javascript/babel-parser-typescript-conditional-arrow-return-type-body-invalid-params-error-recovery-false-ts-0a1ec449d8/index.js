// Unambiguous parameters allow a return type in the body of an arrow function,
// but what is before these `:` can't be the parameters of an arrow function.
a ? () => ((b)) : c => d;
a ? (b: T) => ((c)) : d => e;
a ? (...b) => ([(c)]) : d => e;
a ? (b?) => ({ c: (d) }) : e => f;
a ? async () => ((b) = 1) : c => d;
a ? () => (b, (c)) : d => e;
a ? () => async((b)) : c => d;
a ? () => (b) => ((c)) : d => e;
a ? () => b = ((c)) : d => e;
a ? () => b ? c : ((d)) : e => f;
a ? (b: T) => <U>(c) => ((d)) : e => f;
