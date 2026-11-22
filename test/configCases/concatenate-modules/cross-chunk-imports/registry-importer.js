import * as namespace from "./shared/namespace.js";
import * as context from "./shared/context.js";
import { formatLabel } from "./shared/util.js";

// `eval()` keeps it out of every concatenation, so it renders in the registry
export const useNamespace = () => ({
	evaluated: eval("1"),
	keys: Object.keys(namespace).sort(),
	context: context.read(),
	label: formatLabel("n", 1)
});
