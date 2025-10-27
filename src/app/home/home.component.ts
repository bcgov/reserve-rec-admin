import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { getCurrentUser, fetchAuthSession} from 'aws-amplify/auth';
import { SearchComponent } from './search/search.component';
import { InventoryComponent } from '../inventory/inventory.component';
import { SalesComponent } from '../sales/sales.component';
import { ReportsComponent } from '../reports/reports.component';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
@Component({
    selector: 'app-home',
    imports: [CommonModule, SearchComponent, SalesComponent, InventoryComponent, ReportsComponent, NgdsFormsModule
    ],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
isAuthenticed = false;
isAdmin = false;

constructor(public authService: AuthService, private router: Router, protected cdr: ChangeDetectorRef) {}
async ngOnInit() {
    try {
      // Check if user is already signed in, throws if not
      await getCurrentUser();
      this.isAuthenticed = true;
      this.isAdmin = await this.authService.userIsAdmin();
      const session = await fetchAuthSession();
      this.authService.jwtToken = session?.tokens?.accessToken?.toString();
      console.log('Session:', session);
    } catch (e) {
      console.log(e);
    }
}

  goToLogin() {
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.cdr.detectChanges();
    this.cdr.detach();
  }
}
