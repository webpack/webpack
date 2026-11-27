// `async (...b) =>` can only be an arrow function, so its body can have a
// return type even if it is not followed by `:`, like in TypeScript.
a ? async (...b) => (c) : d => e;
