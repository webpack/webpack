import { greet, type User } from "./greeter.ts";

const alice: User = { name: "Alice", age: 31 };
const bob: User = { name: "Bob", age: 27 };

console.log(greet(alice));
console.log(greet(bob));
