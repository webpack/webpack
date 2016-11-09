import * as E from './a';

it("supports default argument assignment in import", function () {
	let {some, b = a.V6Engine} = {some:"test"};
  	b.toString().should.eql('V6');
});
