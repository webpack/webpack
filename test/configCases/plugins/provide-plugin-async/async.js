import { state } from "./state.js";

await Promise.resolve();
state.ready = true;

export let value = 42;
export const constant = 42;
export default () => 42;
export const nested = { value: 42 };
