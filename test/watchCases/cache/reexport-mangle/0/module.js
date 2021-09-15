const ident = x => x;
import { default as fooImp } from "./foo";
export const foo = ident(fooImp);
import { bar as barImp } from "./bar";
export const bar = ident(barImp);
export const baz = "baz";

console.log.bind(console);
