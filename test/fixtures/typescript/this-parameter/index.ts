function handler(this: HTMLElement, event: Event): void {
	this.focus();
}
function only(this: Window) {}
const method = {
	click(this: Element, x: number) {
		return x;
	}
};
