import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeComponent } from './home.component';
import { AuthService } from '../services/auth.service';
import { ConfigService } from '../services/config.service';
import { provideRouter } from '@angular/router';

// #395: the dashboard was gated on isSuperAdmin(), so staff and limited users
// — who can reach other pages — were shown "No Access" on landing.
describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj('AuthService', ['isSuperAdmin', 'hasPermission']);
    authService.hasPermission.and.returnValue(false);
    authService.isSuperAdmin.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: { config: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  function render(authenticated: boolean, access: boolean): string {
    component.checkingSession = false;
    component.isAuthenticed = authenticated;
    component.hasAccess = access;
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('asks for the lowest tier rather than superadmin', () => {
    component.resolveAccess();

    expect(authService.hasPermission).toHaveBeenCalledWith('limited');
    expect(authService.isSuperAdmin).not.toHaveBeenCalled();
  });

  it('grants the dashboard to any user holding a role', () => {
    authService.hasPermission.and.returnValue(true);

    expect(component.resolveAccess()).toBe(true);
  });

  it('shows the dashboard to a user with access', () => {
    expect(render(true, true)).toContain('Reservations System');
    expect(render(true, true)).not.toContain('No Access');
  });

  it('still shows No Access to an authenticated user with no role', () => {
    expect(render(true, false)).toContain('No Access');
  });
});
