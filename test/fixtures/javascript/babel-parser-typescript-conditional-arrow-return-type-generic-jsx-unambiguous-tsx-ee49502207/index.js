// JSX makes `<T,>` unambiguous, so this can't be a call with type arguments
a ? async <T,>(b) : c => d;
