import myFunction from './module';
import myFunctionDefaultParameter from './moduleDefaultParameter';
import myFunctionExportedFunctionExpression from './moduleExportedFunctionExpression';
import myFunctionExportedFunctionExpressionDefaultParameter from './moduleExportedFunctionExpressionDefaultParameter';

it('should execute IIFE twice', () => {
	expect(myFunction()).toBe(2);
});

it('should execute IIFE twice when using IIFE function name as default parameter', () => {
	expect(myFunctionDefaultParameter()).toBe(2);
});

it('should execute Function Expression twice', () => {
	expect(myFunctionExportedFunctionExpression()).toBe(2);
});

it('should execute Function Expression twice when using IIFE function name as default parameter', () => {
	expect(myFunctionExportedFunctionExpressionDefaultParameter()).toBe(2);
});
