import a from "./a";
import b from "./b";
import c from "./c";
import d from "./d";
import(/* webpackChunkName: "async1" */ "./async1");
console.log(a, b, c, d);
