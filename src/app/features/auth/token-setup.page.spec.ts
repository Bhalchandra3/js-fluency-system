import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthTokenStore } from '../../core/auth/auth-token.store';
import { TokenSetupPage } from './token-setup.page';

describe('TokenSetupPage', () => {
  let fixture: ComponentFixture<TokenSetupPage>;
  let page: TokenSetupPage;
  let tokenStore: jasmine.SpyObj<AuthTokenStore>;

  beforeEach(async () => {
    tokenStore = jasmine.createSpyObj<AuthTokenStore>('AuthTokenStore', [
      'hasToken',
      'setToken',
      'clearToken',
      'getToken',
    ]);
    tokenStore.hasToken.and.returnValue(false);
    tokenStore.setToken.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [TokenSetupPage],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthTokenStore, useValue: tokenStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TokenSetupPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('rejects blank input without saving', () => {
    page.tokenInput = '   ';
    page.saveToken();
    expect(tokenStore.setToken).not.toHaveBeenCalled();
    expect(page.statusKind()).toBe('error');
    expect(page.tokenInput).toBe('   ');
  });

  it('saves the token only on explicit submission and clears the input', () => {
    page.tokenInput = 'user-supplied-token';
    page.saveToken();
    expect(tokenStore.setToken).toHaveBeenCalledWith('user-supplied-token');
    expect(page.tokenInput).toBe('');
    expect(page.statusKind()).toBe('success');
    expect(page.hasSavedToken()).toBeTrue();
  });

  it('does not render the saved token in plaintext', () => {
    tokenStore.hasToken.and.returnValue(true);
    fixture = TestBed.createComponent(TokenSetupPage);
    page = fixture.componentInstance;
    page.tokenInput = '';
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('user-supplied-token');
    expect(text.toLowerCase()).toContain('never shown');

    const input = fixture.nativeElement.querySelector(
      '#bearer-token-input',
    ) as HTMLInputElement;
    expect(input.type).toBe('password');
    expect(input.value).toBe('');
  });

  it('allows replacing a previously saved token', () => {
    tokenStore.hasToken.and.returnValue(true);
    page.hasSavedToken.set(true);
    page.tokenInput = 'replacement-token';
    page.saveToken();
    expect(tokenStore.setToken).toHaveBeenCalledWith('replacement-token');
    expect(page.statusKind()).toBe('success');
  });

  it('clears a saved token via remove action', () => {
    page.hasSavedToken.set(true);
    page.clearSavedToken();
    expect(tokenStore.clearToken).toHaveBeenCalled();
    expect(page.hasSavedToken()).toBeFalse();
    expect(page.statusKind()).toBe('success');
  });
});
