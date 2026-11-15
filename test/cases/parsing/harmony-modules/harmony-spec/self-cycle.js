import { a as b } from "./self-cycle";

var data = [];

data.push(b);
var a = 1;
data.push(b);
a = 2;
data.push(b);
export { a, data }
