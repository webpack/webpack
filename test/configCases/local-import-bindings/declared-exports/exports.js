export function pinned() {
	return "pinned";
}

export class Pinned {}

export function swapped() {
	return "first";
}

export default function named() {
	return "default";
}

// The module points its own binding somewhere else, so an importer must keep
// reading the namespace for it.
swapped = () => "second";
