import { html } from "./page-a-helper.js";
import { count, increment } from "./shared/counter.js";
import { bailouts } from "./shared-bailouts.js";

export const run = () => {
	increment();
	return { html: html(), count, ...bailouts() };
};
