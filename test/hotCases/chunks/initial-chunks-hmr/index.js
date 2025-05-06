import 'lib-js/a'
import.meta.webpackHot.accept();

it("should work if there are new initial chunks", function (done) {
    import('./initial').then(({value}) => {
        expect(value).toBe('a')
	}).catch(done)
	NEXT(require("../../update")(done, true, () => {
		done()
	}))
});
---
import 'lib-js/a'

it("should work if there are new initial chunks", function (done) {
    import('./initial').then(({value}) => {
        expect(value).toBe('b')
		done()
	}).catch(done)
});