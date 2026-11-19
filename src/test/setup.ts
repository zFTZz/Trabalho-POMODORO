import '@testing-library/jest-dom/vitest';

/*
 * Node 22+ declara `globalThis.localStorage` como acessor desabilitado por
 * padrão (retorna `undefined` e pede --localstorage-file) e, a partir do
 * Node 26, ele sobrescreve o localStorage do jsdom. Sem isto, `localStorage`
 * fica undefined e todo teste que limpa ou grava cai em
 * "Cannot read properties of undefined". Este substituto em memória atende à
 * interface `Storage` que o adaptador de persistência usa nos testes.
 */
function criarStorageEmMemoria(): Storage {
  let dados = new Map<string, string>();
  return {
    get length() {
      return dados.size;
    },
    clear() {
      dados = new Map();
    },
    getItem(chave: string) {
      return dados.get(chave) ?? null;
    },
    key(indice: number) {
      return [...dados.keys()][indice] ?? null;
    },
    removeItem(chave: string) {
      dados.delete(chave);
    },
    setItem(chave: string, valor: string) {
      dados.set(chave, String(valor));
    },
  } as Storage;
}

const descritor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const storageAtual = descritor && 'value' in descritor ? (descritor.value as Storage | undefined) : undefined;

if (typeof storageAtual?.clear !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: criarStorageEmMemoria(),
    configurable: true,
    writable: true,
  });
}

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
