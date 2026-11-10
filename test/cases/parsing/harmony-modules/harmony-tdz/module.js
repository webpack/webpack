import { f } from "./module2";

export let exception;

try {
	f();
} catch(e) {
	exception = e;
}

export const value = "value";

export default f();
