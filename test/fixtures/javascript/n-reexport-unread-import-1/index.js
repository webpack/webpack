// A name nothing reads leaves the rest of an import to print as `export…from`.
import foo, { bar } from "somewhere";
export { bar };
import { a, b } from "x";
import { c, d } from "x";
export { a, a as e, c };
// One read elsewhere keeps the import.
import { f, g } from "y";
export { f };
g();
