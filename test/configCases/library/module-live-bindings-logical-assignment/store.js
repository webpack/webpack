export let callable = null;
export let fallback = 0;

export function replace() {
	callable ??= function () {};
	fallback ||= () => 1;
}
