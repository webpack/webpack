function C() {
	this.ok = expect(this.pok);
}

C.prototype.pok = true;

export default C;
export { C };
