import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../services/auth.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let navigatedTo: any[] | null;
  let mockAuthService: any;

  async function setup(session: any) {
    navigatedTo = null;
    mockAuthService = {
      session: signal(session),
      loginWithProvider: (_p: string) => { },
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: { navigate: (commands: any[]) => { navigatedTo = commands; return Promise.resolve(true); } } },
      ],
      schemas: [],
    })
      .overrideComponent(LoginComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('redirects an already-authenticated user away from the login page (#360)', async () => {
    await setup({ tokens: { idToken: 'stub' } });
    expect(navigatedTo).toEqual(['/']);
  });

  it('leaves an unauthenticated user on the login page', async () => {
    await setup(null);
    expect(navigatedTo).toBeNull();
  });

  it('does not redirect when a session exists but carries no tokens', async () => {
    await setup({});
    expect(navigatedTo).toBeNull();
  });
});
