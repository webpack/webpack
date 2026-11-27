// Not followed by `:`: these are a type assertion and a call with type arguments
a ? <T>(b) : c => d;
a ? <T>(b): C => (d);
a ? <T>(b) => <U>(c) : d => e;
a ? async<T>(b) : c => d;
