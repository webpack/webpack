// Regression test for tokenizer bug where the `{` after `<T>` was considered a JSX interpolation.
class C extends D<T> {}
<C/>
