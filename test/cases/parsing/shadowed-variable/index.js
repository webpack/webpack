import lib from './lib';
it ("should parse block scoped variables in separate block", function(){
    function bar() {
        lib.should.be.a.Function;
        lib().should.be.true;
        let x=1;
        for(const lib of [1,2,3]){
            lib.should.be.a.Number;
            lib.should.be.eql(x);
            x++;
        }
        x=1;
        for(const lib in [1,2,3]){
            [1,2,3][lib].should.be.eql(x);
            x++;
        }
        x= 0;
        for(const lib = [1,2,3];x<lib.length;x++){
            lib.should.be.an.Array;
            lib[x].should.be.eql(x+1);
        }
    }
    bar();
});

it("should parse un-shadowed variables in same block", function () {
    (lib===undefined).should.be.true;
    let x = 0;
    for (var lib = [1, 2, 3]; x < lib.length; x++) {
        lib.should.be.an.Array;
        lib[x].should.be.eql(x + 1);
    }
    lib.should.be.an.Array;
    x=1;
    for (var lib of [1, 2, 3]) {
        lib.should.be.a.Number;
        lib.should.be.eql(x);
        x++;
    }
    lib.should.be.eql(3);
    x = 1;
    for (var lib in [1, 2, 3]) {
        [1, 2, 3][lib].should.be.eql(x);
        x++;
    }
    lib.should.be.eql("2");

})