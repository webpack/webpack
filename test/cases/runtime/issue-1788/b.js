import a from './a';
export default 'b-default';

export function btest() {
	a.should.be.eql("a-default");
}
