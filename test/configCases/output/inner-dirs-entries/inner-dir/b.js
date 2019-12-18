import dummy from 'dummy_module';

it("should load", done => {
    expect(dummy()).toBe('this is just a dummy function');
    done();
});
