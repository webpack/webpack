// JSX makes type parameters unambiguous, so these don't inherit the restriction.
a ? <T,>(b): U => c : d;
a ? async <T,>(b): U => c : d;
a ? <T,>(b) => (c) : d;
