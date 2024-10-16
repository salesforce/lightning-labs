import { api } from 'lwc';
import { ContextfulLightningElement, defineState } from '@lwc/state';
import parentStateFactory from './parentState.js';

const fooState = parentStateFactory('foobar');

export default class App extends ContextfulLightningElement {
  parentState = parentStateFactory('parentFoo');
  foo = fooState;
  // later in time
  // fooState = parentStateFactory('foo')
}

class Other extends ContextfulLightningElement {
  otherFoo = fooState;
}
