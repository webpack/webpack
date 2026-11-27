// `({ b }: T)` might be a parenthesized expression, so it can't have a return
// type that is not followed by `:`, like in TypeScript.
a ? ({ b }: T): c => d;
