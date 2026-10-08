import { NotHere } from './stub'

it('should do nothing', function() {
  if (typeof NotHere !== 'undefined') {
    throw new Error('This shouldn\'t be here!');
  }
});
