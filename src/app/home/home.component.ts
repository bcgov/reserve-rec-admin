import { AfterViewChecked, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { getCurrentUser } from 'aws-amplify/auth';
import { SearchComponent } from './search/search.component';
import { InventoryComponent } from '../inventory/inventory.component';
import { SalesComponent } from '../sales/sales.component';
import { ReportsComponent } from '../reports/reports.component';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { LoginComponent } from '../login/login.component';
@Component({
  selector: 'app-home',
  imports: [CommonModule, SearchComponent, SalesComponent, InventoryComponent, ReportsComponent, NgdsFormsModule, LoginComponent
  ],
  templateUrl: './home.component.html',

  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, AfterViewChecked, OnDestroy {
  isAuthenticed = false;
  isAdmin = false;
  checkingSession = true;

  constructor(public authService: AuthService, private router: Router, protected cdr: ChangeDetectorRef) { }
  async ngOnInit() {
    try {
      // Check if user is already signed in, throws if not
      await getCurrentUser();
      this.isAuthenticed = true;
      this.isAdmin = this.authService.isSuperAdmin();
    } catch (e) {
      console.log(e);
    } finally {
      this.checkingSession = false;
    }
  }

  ngAfterViewChecked(): void {
    this.cdr.detectChanges()
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.cdr.detectChanges();
    this.cdr.detach();
  }
}
