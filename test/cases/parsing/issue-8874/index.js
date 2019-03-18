import myFunction from './module';
import myFunctionDefaultParameter from './moduleDefaultParameter';

it('should execute IIFE twice', () => {
    expect(myFunction()).toBe(2);
});

it('should execute IIFE twice when using IIFE function name as default parameter', () => {
    expect(myFunctionDefaultParameter()).toBe(2);
});
