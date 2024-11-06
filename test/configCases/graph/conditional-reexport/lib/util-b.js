import { common } from "./common"
var b = ({}).toString(); // side effect, this will keep lib/index.js exist in the output, bailout the optimization from SideEffectsFlagPlugin
export function utilB() {
  return b + ' ' + common;
}
