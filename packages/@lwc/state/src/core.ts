import { setTrustedSignalSet as lwcSetTrustedSignalSet } from 'lwc';
import { setTrustedSignalSet as signalsSetTrustedSignalSet } from '@lwc/signals';

const trustedSignalSet = new WeakSet();
lwcSetTrustedSignalSet(trustedSignalSet);
signalsSetTrustedSignalSet(trustedSignalSet);

export { defineState } from './index.js';
export { ContextfulLightningElement } from './contextful-lwc.js';
