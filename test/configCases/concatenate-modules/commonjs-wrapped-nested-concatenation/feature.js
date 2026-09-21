import { settings } from "./settings";
import { value as separateValue } from "./keeps-settings-separate";

global.__nestedConcatOrder = (global.__nestedConcatOrder || []).concat(
	"feature"
);

export const value = settings.value;
export { separateValue };
