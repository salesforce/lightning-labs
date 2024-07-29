import { chai } from '@open-wc/testing';
import { JestAsymmetricMatchers, JestChaiExpect, JestExtend } from '@vitest/expect';

// Allows using expect.extend instead of chai.use to extend plugins
chai.use(JestExtend);
// Adds all jest matchers to expect
chai.use(JestChaiExpect);
// Adds asymmetric matchers like stringContaining, objectContaining
chai.use(JestAsymmetricMatchers);

export const expect = chai.expect;
