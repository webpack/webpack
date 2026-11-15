import someFunction from './someFunction';

export default (function someFunction (recurse = true) {
	if (recurse) {
		return 1 + someFunction(false);
	}

	return 1;
});
