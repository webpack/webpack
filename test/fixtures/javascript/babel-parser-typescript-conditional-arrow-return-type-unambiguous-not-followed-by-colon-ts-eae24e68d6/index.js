// `(b: B)` can only be an arrow function, so it keeps its return type even
// if it is not followed by `:`, like in TypeScript.
a ? (b: B): c => d;
