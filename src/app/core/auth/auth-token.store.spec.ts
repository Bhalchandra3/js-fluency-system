import { AuthTokenStore, AUTH_TOKEN_STORAGE_KEY } from './auth-token.store';

describe('AuthTokenStore', () => {
  let store: AuthTokenStore;
  let memory: Record<string, string>;

  beforeEach(() => {
    store = new AuthTokenStore();
    memory = {};

    spyOn(localStorage, 'getItem').and.callFake((key: string) =>
      Object.prototype.hasOwnProperty.call(memory, key) ? memory[key]! : null,
    );
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      memory[key] = value;
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete memory[key];
    });
  });

  it('saves and retrieves a token', () => {
    expect(store.setToken('secret-value')).toBeTrue();
    expect(store.getToken()).toBe('secret-value');
    expect(store.hasToken()).toBeTrue();
    expect(memory[AUTH_TOKEN_STORAGE_KEY]).toBe('secret-value');
  });

  it('trims surrounding whitespace when saving', () => {
    expect(store.setToken('  padded-token  ')).toBeTrue();
    expect(store.getToken()).toBe('padded-token');
  });

  it('treats missing and blank values as unauthenticated', () => {
    expect(store.getToken()).toBeNull();
    expect(store.hasToken()).toBeFalse();
    expect(store.setToken('   ')).toBeFalse();
    expect(store.getToken()).toBeNull();
  });

  it('clears the stored token', () => {
    store.setToken('to-clear');
    store.clearToken();
    expect(store.getToken()).toBeNull();
    expect(memory[AUTH_TOKEN_STORAGE_KEY]).toBeUndefined();
  });

  it('handles storage failures without crashing', () => {
    (localStorage.setItem as jasmine.Spy).and.throwError('quota');
    expect(store.setToken('anything')).toBeFalse();

    (localStorage.getItem as jasmine.Spy).and.throwError('denied');
    expect(store.getToken()).toBeNull();

    (localStorage.removeItem as jasmine.Spy).and.throwError('denied');
    expect(() => store.clearToken()).not.toThrow();
  });

  it('does not put token values into thrown error messages', () => {
    (localStorage.setItem as jasmine.Spy).and.callFake(() => {
      throw new Error('Storage failed');
    });
    expect(store.setToken('super-secret-token-value')).toBeFalse();
    // Store swallows the error; no rethrow containing the token.
  });
});
