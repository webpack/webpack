export function pitch(remainingRequest, previousRequest) {
	return [remainingRequest, previousRequest].join(":");
}
