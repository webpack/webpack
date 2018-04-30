import b from './b';
export default 'a-default';
export { btest } from "./b";

export function atest() {
	b.should.be.eql("b-default");
}
