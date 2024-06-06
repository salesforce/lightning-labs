import { CodeJar } from 'codejar';
import { LightningElement, api } from 'lwc';
import htmlPlugin from 'prettier/esm/parser-html.mjs';

export default class Codejar extends LightningElement {
  @api nomargin = false;

  _content = '';
  @api get content() {
    return this._content;
  }
  set content(newValue) {
    this._content = newValue;
    if (this.hasRendered) {
      this.jar.updateCode(newValue);
    }
  }

  connectedCallback() {
    if (this.nomargin) {
      this.classList.add('no-margin');
    }
  }

  hasRendered = false;
  renderedCallback() {
    if (this.hasRendered) {
      return;
    }
    this.hasRendered = true;
    const editorEl = this.template.querySelector('.editor');
    this.jar = new CodeJar(
      editorEl,
      (editor) => {
        editor.innerHTML = highlightHtmlText(editor.textContent);
      },
      { tab: '  ' },
    );
    this.jar.updateCode(this.content);
    editorEl.addEventListener('input', () => (this._content = this.jar.toString()));
  }

  onKeyDown(evt) {
    if (evt.key === 'Tab') {
      evt.stopPropagation();
    }
  }
}

/**
 * @param {string} text
 * @returns {string}
 */
function highlightHtmlText(text) {
  const ast = htmlPlugin.parsers.html.parse(text);
  return highlightHtmlAst(ast.children);
}

function highlightHtmlAst(ast) {
  let result = '';
  for (const node of ast) {
    if (node.type === 'text') {
      result += node.value;
    } else {
      result += `<span class="highlight-tag">&lt;${node.name}</span>`;
      for (const attr of node.attrs) {
        result += `<span class="highlight-attr"> ${attr.name}</span>`;
        if (attr.value) {
          result += '<span class="highlight-equals">=</span>';
          result += `<span class="highlight-value">"${attr.value}"</span>`;
        }
      }
      result += '<span class="highlight-tag">&gt;</span>';
      result += highlightHtmlAst(node.children);
      result += `<span class="highlight-tag">&lt;/${node.name}&gt;</span>`;
    }
  }
  return result;
}
