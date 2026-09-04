// A library a script outside the bundle expects to find on a global.
export default function jQuery(selector) {
	return `element(${selector})`;
}
