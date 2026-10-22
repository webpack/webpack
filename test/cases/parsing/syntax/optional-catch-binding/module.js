export default function() {
	try {
		throw new Error();
	} catch {
		return true;
	}
};
