import myFunction from './module';

it('should execute IIFE twice', () => {
    expect(myFunction()).toBe(2);
});
