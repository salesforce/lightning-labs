import { setTrustedSignalSet as lwcSetTrustedSignalSet } from 'lwc';
import { setTrustedSignalSet as signalsSetTrustedSignalSet } from '@lwc/signals';

const trustedSignalSet = new WeakSet();
lwcSetTrustedSignalSet(trustedSignalSet);
signalsSetTrustedSignalSet(trustedSignalSet);

export { defineState, ContextfulLightningElement } from './index.js';
