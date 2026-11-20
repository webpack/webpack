import { formatValue } from "./util.js";
import { bracket } from "./private.js";

export const render = (tag, value) => `<${tag}>${formatValue(value)}</${tag}>`;
export default function wrap(content) {
	return bracket(content);
}
