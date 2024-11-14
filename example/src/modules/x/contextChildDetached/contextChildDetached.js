import { ContextfulLightningElement } from '@lwc/state/context';
import { fromContext } from '@lwc/state';
import childStateFactory from 'x/childState';
import parentStateFactory from 'x/parentState';

export default class ContextChild extends ContextfulLightningElement {
  parentState = fromContext(parentStateFactory);

  get nameProvidedByParent() {
    return this.parentState.value?.name ?? 'not available';
  }
}
