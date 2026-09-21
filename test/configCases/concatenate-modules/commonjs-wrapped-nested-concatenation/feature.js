import { settings } from "./settings";
import { shared } from "./shared";
import { describeSettings } from "./legacy";

global.__nestedConcatOrder = (global.__nestedConcatOrder || []).concat(
	"feature"
);

export function render() {
	return `${settings.apiBase} (${describeSettings()}) ${shared}`;
}
