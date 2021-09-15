import { other } from "./inner-reexport";

console.log.bind(console, other);
