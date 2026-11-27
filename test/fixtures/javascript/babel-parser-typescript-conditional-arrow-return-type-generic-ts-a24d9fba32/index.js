// Type parameters make the parameters ambiguous, even if they would not be
// without them, so the body of the arrow function inherits the restriction.
a ? <T>(b) => (c) : d => e;
a ? <T>() => (b) : c => d;
a ? <T>(...b) => (c) : d => e;
a ? <T>(b: U) => (c) : d => e;
a ? <T>(b: T): T => (b) : c => d;
a ? async <T>(b) => (c) : d => e;
a ? async <T>(): U => (b) : c => d;
a ? b => <T>(c): U => (d) : e => f;
a ? (b) => <T>(c) => (d) : e => f;
a ? b = <T>(c) => (d) : e => f;
