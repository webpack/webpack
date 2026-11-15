await Promise.resolve();
export * from "./store.js";
export { default } from "./store.js";
export let own = 0;
export function incrementOwn() {
	return own++;
}
