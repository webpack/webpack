
import someFunction from './someFunction';

export default (function someFunction (recurse = true, recurseFunction = someFunction) {
	if (recurse) {
		return 1 + recurseFunction(false);
	}

	return 1;
});
