var __defProp = Object.defineProperty;
var __publicField = (obj, key, value) => {
  if (typeof key !== "symbol")
    key += "";
  if (key in obj)
    return __defProp(obj, key, {enumerable: true, configurable: true, writable: true, value});
  return obj[key] = value;
};
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _errors;
import indentString from "/-/indent-string@v5.0.0-VgKPSgi4hUX5NbF4n3aC/dist=es2020,mode=imports/optimized/indent-string.js";
import cleanStack from "/-/clean-stack@v4.1.0-DgWUKXHVzThBBZtsHXhC/dist=es2020,mode=imports/optimized/clean-stack.js";
const cleanInternalStack = (stack) => stack.replace(/\s+at .*aggregate-error\/index.js:\d+:\d+\)?/g, "");
class AggregateError extends Error {
  constructor(errors) {
    _errors.set(this, void 0);
    __publicField(this, "name", "AggregateError");
    if (!Array.isArray(errors)) {
      throw new TypeError(`Expected input to be an Array, got ${typeof errors}`);
    }
    errors = errors.map((error) => {
      if (error instanceof Error) {
        return error;
      }
      if (error !== null && typeof error === "object") {
        return Object.assign(new Error(error.message), error);
      }
      return new Error(error);
    });
    let message = errors.map((error) => {
      return typeof error.stack === "string" ? cleanInternalStack(cleanStack(error.stack)) : String(error);
    }).join("\n");
    message = "\n" + indentString(message, 4);
    super(message);
    __privateSet(this, _errors, errors);
  }
  get errors() {
    return __privateGet(this, _errors).slice();
  }
}
_errors = new WeakMap();
export default AggregateError;
