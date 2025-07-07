import { Component, OnInit } from '@angular/core';
import { AmplifyService } from '../services/amplify.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { signInWithRedirect, getCurrentUser, fetchAuthSession, signOut, fetchUserAttributes } from 'aws-amplify/auth';
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
export class HomeComponent implements OnInit {
isAuthenticed = false;
isAdmin = false;

constructor(public amplifyService: AmplifyService, private router: Router) {}
async ngOnInit() {
    try {
      // Check if user is already signed in, throws if not
      await getCurrentUser();
      this.isAuthenticed = true;
      this.isAdmin = await this.amplifyService.userIsAdmin();
      console.log("are you the admin??:", this.isAdmin)
      console.log('User is authenticated', getCurrentUser());
      const session = await fetchAuthSession();
      console.log('Session:', session);
    } catch (e) {
      console.log(e);
    }
}

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
