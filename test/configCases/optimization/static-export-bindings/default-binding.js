// `export { x as default }` is a live binding (unlike `export default <expr>`)
let mutableDefault = 0;
export function bumpDefault() {
	mutableDefault++;
}
export { mutableDefault as default };
