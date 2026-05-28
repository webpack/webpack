// `export { const as default }` is immutable -> eligible for value binding
const constDefault = "const-default";
export { constDefault as default };
