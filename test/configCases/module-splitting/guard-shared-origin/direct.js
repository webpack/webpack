import { shared } from "./origin";

// A named default declaration also belongs to the module scope.
export default function namedDefault() {
	return shared;
}

export const viaDirect = shared;
