export default "default";
export const named = "named";
export let counter = 0;
export function increment() {
	counter++;
}
export { reexported } from "./reexport.js";
export const nothing = undefined;
