import basicSheet from './basic.css' assert { type: "css"}

it('should compile basic sheet', (done) => {
	expect(basicSheet._css).toMatchSnapshot()
	done()
})