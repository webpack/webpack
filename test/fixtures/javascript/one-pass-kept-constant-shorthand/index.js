// A global `const` stays, but a shorthand printing its value after its key
// prints the value there, as any other read does.
const name = 1;
const longer = "a much longer string than its name";
var keyed = { name, longer };
console.log(keyed.name, keyed.longer, JSON.stringify({ name }));
