// A built-in called on a literal read off an object literal folds, as it
// does on the literal itself.
console.log({ text: "abc" }.text.slice(1), { count: 42 }.count.toString());
console.log({ text: "x" }.text.toUpperCase(), { a: 1, a: 2 }.a.toFixed(1));
// A sibling that runs code, a getter, or an answer longer than the call keeps it.
var log = [];
console.log({ text: "x", other: log.push(1) }.text.repeat(2));
console.log({ get text() { return "y"; } }.text.toUpperCase());
console.log({ text: "ab" }.text.repeat(50).length, log);
