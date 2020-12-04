import { f } from "./reexport";

console.log.bind(console, f);

export default f();
