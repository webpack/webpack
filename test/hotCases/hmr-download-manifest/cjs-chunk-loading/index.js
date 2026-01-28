if (module.hot) {
    module.hot.accept()
}
it('Should work', (done) => {
    expect(1).toBe(1)
    NEXT(
        require("../../update")(done, true, () => {
            done();
        })
    );
})
---
// https://github.com/webpack/webpack/pull/19832#event-19319802751
// This is because within the checkForUpdate(hot/signal.js), we will proactively check for updates again. If there are no updates at this time, it is acceptable.
it('Should be no error when the HMR update detects that the hot-update.json file does not exist', (done) => {
    expect(1).toBe(1)
    __webpack_require__.hmrM().then(() => {
        done()
    }).catch((err) => {
        done(err)
    })
})
