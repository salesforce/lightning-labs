import type { Signal } from '@lwc/signals';
import { LightningElement } from 'lwc';
import { ContextRequestEvent, type ContextProvidedCallback, symbolContextKey } from './event.js';
import { connectContext } from './index.js';
import type { ContextRuntimeAdapter } from './runtime-interface.js';

export class ContextfulLightningElement extends LightningElement {
  connectedCallback(): void {
    this.setupContextReactivity();
  }

  private setupContextReactivity() {
    const contextfulFields = Object.getOwnPropertyNames(Object.getPrototypeOf(this)).filter(
      (propName) => this[propName]?.[connectContext],
    );

    if (contextfulFields.length === 0) {
      return;
    }

    const el = this;
    let isProvidingContext = false;
    const providedContextVarieties = new Map<unknown, Signal<unknown>>();

    const contextRuntimeAdapter: ContextRuntimeAdapter<LightningElement> = {
      isServerSide: false,

      provideContext<T extends object>(
        contextVariety: T,
        providedContextSignal: Signal<unknown>,
      ): void {
        if (!isProvidingContext) {
          isProvidingContext = true;

          // TODO: what if two state managers of the same variety are attached to the same LWC? In that case,
          //       we would have two event listeners listening for the same variety of context. The event
          //       listener related to one of those would be invoked, event.stopImmediatePropagation would
          //       be called, and context would be provided from one of the instances of the requested variety.
          //       However, the behavior here is somewhere ambiguous and undefined, so we should define the
          //       behavior explicitly.

          el.addEventListener('lightning:context-request', (event: CustomEvent) => {
            if (
              event.detail.key === symbolContextKey &&
              providedContextVarieties.has(event.detail.contextVariety)
            ) {
              event.stopImmediatePropagation();
              const providedContextSignal = providedContextVarieties.get(
                event.detail.contextVariety,
              );
              event.detail.callback(providedContextSignal);
              // TODO: we need to detect when the ContextfulLightningElement is unmounted/disconnected and
              //       make sure that consumers' signals are also disconnected at that time
            }
          });
        }
        providedContextVarieties.set(contextVariety, providedContextSignal);
      },

      consumeContext<T extends object>(
        contextVariety: T,
        contextProvidedCallback: ContextProvidedCallback,
      ): void {
        const event = new ContextRequestEvent({
          contextVariety,
          callback: contextProvidedCallback,
        });

        el.dispatchEvent(event);
      },
    };

    for (const contextfulField of contextfulFields) {
      this[contextfulField][connectContext](contextRuntimeAdapter);
    }
  }
}
