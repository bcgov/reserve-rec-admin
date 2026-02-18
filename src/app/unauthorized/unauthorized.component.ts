import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="unauthorized-container">
      <div class="unauthorized-content">
        <h1>Access Denied</h1>
        <p>You don't have permission to access this page.</p>
        <p class="help-text">If you believe you should have access, please contact your administrator.</p>
        <button class="btn btn-primary" (click)="goHome()">Go to Home</button>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 70vh;
      padding: 20px;
    }

    .unauthorized-content {
      text-align: center;
      max-width: 500px;
    }

    h1 {
      color: #d32f2f;
      margin-bottom: 20px;
    }

    p {
      color: #666;
      margin-bottom: 15px;
      font-size: 16px;
    }

    .help-text {
      font-size: 14px;
      font-style: italic;
    }

    .btn {
      margin-top: 20px;
      padding: 10px 30px;
      font-size: 16px;
    }
  `]
})
export class UnauthorizedComponent {
  constructor(private router: Router) {}

  goHome(): void {
    this.router.navigate(['/']);
  }
}
