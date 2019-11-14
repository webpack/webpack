import { a as a1 } from "./reexport-known";
import { a as a2, c as c2 } from "./reexport-unknown";
import { a as a3 } from "./reexport-star-known";
import { a as a4, c as c4 } from "./reexport-star-unknown";
import { y } from "./edge";

console.log(a1, a2, a3, a4, c2, c4, y);

require.include("./require.include");
