import { b, c } from './a'

export function track1() {
	(function (a = b()) {})()
}

export function track2() {
	((a = c()) => {})()
}
