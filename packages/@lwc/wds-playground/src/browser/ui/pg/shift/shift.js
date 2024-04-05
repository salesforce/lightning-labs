import '@shoelace-style/shoelace/dist/components/details/details.js';
import { LightningElement, api } from 'lwc';

export default class Shift extends LightningElement {
  counter = 1;
  _layoutShiftAttributions;

  @api
  get layoutShiftAttributions() {
    return this._layoutShiftAttributions;
  }
  set layoutShiftAttributions(value) {
    this._layoutShiftAttributions = value;
    this.renderDifferences();
  }

  get compKey() {
    return ++this.counter;
  }

  stringifyJSON(data) {
    return JSON.stringify(data, null, 4);
  }

  renderDifferences() {
    const appendElement = this.template.querySelector('.append');
    if (appendElement) {
      // clean up any prior observed layout shift elements
      appendElement.replaceChildren();
    }

    for (const layoutShiftAttribution of this.layoutShiftAttributions) {
      const highlightedHTML = this.highlightDifferences(layoutShiftAttribution);
      const containerRow = document.createElement('div');
      containerRow.className = 'row';
      const prevState = document.createElement('div');
      prevState.className = 'column';
      const prevElem = document.createElement('pre');
      const currState = document.createElement('div');
      currState.className = 'column';
      const currElem = document.createElement('pre');

      prevElem.innerHTML = highlightedHTML[0];
      currElem.innerHTML = highlightedHTML[1];
      prevState.appendChild(prevElem);
      currState.appendChild(currElem);

      // Insert into DOM
      containerRow.appendChild(prevState);
      containerRow.appendChild(currState);
      appendElement.appendChild(containerRow);
    }
  }

  highlightDifferences(layoutShiftAttribution) {
    const currentState = layoutShiftAttribution[0].toJSON();
    const updatedState = layoutShiftAttribution[1].toJSON();
    const highlightedHTML = [];
    const diff = {};

    // Find differences between currentState and updatedState
    for (const key in currentState) {
      if (currentState[key] !== updatedState[key]) {
        diff[key] = [currentState[key], updatedState[key]];
      }
    }

    // Generate HTML with differences highlighted
    highlightedHTML.push(this.generateHighlightedHTML(currentState, diff));
    highlightedHTML.push(this.generateHighlightedHTML(updatedState, diff));

    return highlightedHTML;
  }

  generateHighlightedHTML(state, diff) {
    let html = '';
    for (const key in state) {
      if (diff[key]) {
        html += `<span style="background-color: var(--sl-color-teal-200)">${key}: ${state[key]}</span><br>`;
      } else {
        html += `${key}: ${state[key]}<br>`;
      }
    }
    return html;
  }
}
