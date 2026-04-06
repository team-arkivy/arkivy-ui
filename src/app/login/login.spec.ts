import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { vi } from 'vitest';

import { LoginComponent } from './login';

@Component({ standalone: true, template: '' })
class StubRouteComponent {}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        StubRouteComponent,
        RouterTestingModule.withRoutes([
          { path: 'dashboard', component: StubRouteComponent },
          { path: 'forgot-password', component: StubRouteComponent },
          { path: 'register', component: StubRouteComponent },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the brand title', () => {
    const title: HTMLElement | null =
      fixture.nativeElement.querySelector('.brand-title');
    expect(title?.textContent).toContain('Arkivy');
  });

  it('should render username and password inputs', () => {
    const inputs = fixture.nativeElement.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('should render the LOGIN button', () => {
    const btn: HTMLElement | null = fixture.nativeElement.querySelector('.btn-login');
    expect(btn).toBeTruthy();
  });

  it('should render Google and Microsoft OAuth buttons', () => {
    const oauthBtns = fixture.nativeElement.querySelectorAll('.oauth-btn');
    expect(oauthBtns.length).toBe(2);

    const labels = Array.from(oauthBtns).map((b) => (b as HTMLElement).textContent?.trim() ?? '');
    expect(labels.some((l) => l.includes('Google'))).toBe(true);
    expect(labels.some((l) => l.includes('Microsoft'))).toBe(true);
  });

  it('should start with empty credentials', () => {
    expect(component.credentials.username).toBe('');
    expect(component.credentials.password).toBe('');
  });

  it('should start with showPassword = false', () => {
    expect(component.showPassword).toBe(false);
  });

  it('should start with isLoading = false', () => {
    expect(component.isLoading).toBe(false);
  });

  it('should start with no loginError', () => {
    expect(component.loginError).toBe('');
  });

  it('should toggle showPassword when togglePassword() is called', () => {
    expect(component.showPassword).toBe(false);
    component.togglePassword();
    expect(component.showPassword).toBe(true);
    component.togglePassword();
    expect(component.showPassword).toBe(false);
  });

  it('should change input type when toggle button is clicked', () => {
    const toggleBtn: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.toggle-pw');
    const pwInput: HTMLInputElement | null =
      fixture.nativeElement.querySelector('#password');

    expect(toggleBtn).toBeTruthy();
    expect(pwInput).toBeTruthy();
    expect(pwInput!.type).toBe('password');
    toggleBtn!.click();
    fixture.detectChanges();
    expect(pwInput!.type).toBe('text');
  });

  it('should trigger shake when submitting with empty fields', () => {
    component.credentials = { username: '', password: '' };
    component.onSubmit();
    expect(component.shakeCard).toBe(true);
  });

  it('should not set isLoading when fields are empty', () => {
    component.credentials = { username: '', password: '' };
    component.onSubmit();
    expect(component.isLoading).toBe(false);
  });

  it('should set isLoading = true when credentials are provided', () => {
    vi.useFakeTimers();
    try {
      component.credentials = { username: 'testuser', password: 'secret123' };
      component.onSubmit();

      expect(component.isLoading).toBe(true);
      vi.advanceTimersByTime(1800);
      expect(component.isLoading).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should call loginWithGoogle() when Google button is clicked', () => {
    vi.spyOn(component, 'loginWithGoogle');
    const googleBtn: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.oauth-google');
    googleBtn!.click();
    expect(component.loginWithGoogle).toHaveBeenCalled();
  });

  it('should call loginWithMicrosoft() when Microsoft button is clicked', () => {
    vi.spyOn(component, 'loginWithMicrosoft');
    const msBtn: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.oauth-microsoft');
    msBtn!.click();
    expect(component.loginWithMicrosoft).toHaveBeenCalled();
  });

  it('should render the network canvas element', () => {
    const canvas = fixture.nativeElement.querySelector('canvas.network-canvas');
    expect(canvas).toBeTruthy();
  });

  it('should destroy without errors', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
