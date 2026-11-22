// for side effects only: the connection to a side-effect-free module is inactive
import "./shared/private.js";
import wrap, { render } from "./shared/component.js";
import { formatLabel } from "./shared/util.js";
import { count, increment } from "./shared/counter.js";
import { bailouts } from "./shared-bailouts.js";
import { useNamespace } from "./registry-importer.js";

export const run = () => {
	increment();
	return { html: wrap(render("b", formatLabel("rank", 5))), count, ...bailouts(), registry: useNamespace() };
};
