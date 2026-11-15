import state from "./state.js";

await new Promise(resolve => setTimeout(resolve, 0));
state.ready = true;
