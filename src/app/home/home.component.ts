import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { getCurrentUser } from 'aws-amplify/auth';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { LoginComponent } from '../login/login.component';
@Component({
  selector: 'app-home',
  imports: [CommonModule, NgdsFormsModule, LoginComponent],
  templateUrl: './home.component.html',

  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  isAuthenticed = false;
  hasAccess = false;
  checkingSession = true;

  constructor(public authService: AuthService, private router: Router, protected cdr: ChangeDetectorRef) { }
  async ngOnInit() {
    try {
      // Check if user is already signed in, throws if not
      await getCurrentUser();
      this.isAuthenticed = true;
      this.hasAccess = this.resolveAccess();
    } catch (e) {
      console.log(e);
    } finally {
      this.checkingSession = false;
    }
  }

  // The dashboard is gated on having any role at all, not on superadmin:
  // staff and limited users have access to other pages and were being shown
  // "No Access" here (#395). 'limited' is the lowest tier, and hasPermission
  // passes on any collection the user holds it for.
  resolveAccess(): boolean {
    return this.authService.hasPermission('limited');
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.cdr.detectChanges();
    this.cdr.detach();
  }
}
