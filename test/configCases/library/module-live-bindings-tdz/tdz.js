let letError = "none";
try {
	read();
} catch (error) {
	letError = error.name;
}
let classError = "none";
try {
	new Shape();
} catch (error) {
	classError = error.name;
}
export const errors = [letError, classError];

export function read() {
	return count;
}
export let count = 0;
export function bump() {
	count++;
	Shape = class Square {};
}
export class Shape {}
