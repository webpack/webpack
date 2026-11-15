export var result = []
var value = 1
export { value as other } from "./value"
;[4, 5].forEach(function (n) { result.push(n) })
