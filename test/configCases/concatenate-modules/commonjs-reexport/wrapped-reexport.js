// reached through require(), so this re-exporter is wrapped and emits its
// default re-export as runtime code instead of a hoisted binding
export { default as dynamicDefault } from "./dynamic-exports";
