import basicSheet from './basic.css' assert { type: "css"}

it('should compile basic sheet', (done) => {
	expect(basicSheet.css).toMatchSnapshot()
	done()
})