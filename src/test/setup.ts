import '@testing-library/jest-dom/vitest';

/*
 * jsdom ainda não implementa o método showModal/close do elemento <dialog>.
 * Este polyfill mínimo permite testar a interface sem alterar o comportamento real.
 */
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  }
}
