import * as E from './a';


function fooBar({some, bar = E.V6Engine}) {
	return new bar().toString();
}

it("supports default argument assignment in import", function () {
	fooBar({some:"test"}).should.eql('V6');
});
