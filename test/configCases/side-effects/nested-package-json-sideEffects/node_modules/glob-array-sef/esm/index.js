import { heavy } from "./heavy.js";
import { light } from "./light.js";

export function useHeavy() {
	return heavy;
}

export { light, heavy };
