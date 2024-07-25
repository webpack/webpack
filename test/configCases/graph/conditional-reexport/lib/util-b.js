import { common } from "./common"
var b = ({}).toString(); // side effect
export function utilB() {
  return b + ' ' + common.C;
}
