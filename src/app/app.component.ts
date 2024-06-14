import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { SetupFormComponent } from './setup-form/setup-form.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { BehaviorSubject, Subscription } from 'rxjs';
import { ProfileComponent } from './profile/profile.component';
import { ResultListComponent } from './result-list/result-list.component';
import { DataService } from './services/data.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SetupFormComponent, CheckoutComponent, ProfileComponent, ResultListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnDestroy {
  public _setupData = new BehaviorSubject<any>(null);
  public _profileData = new BehaviorSubject<any>(null);
  public dataList: any[] = [];
  public price: number = 0;
  title = 'bambora-checkout';

  public subscriptions = new Subscription;

  constructor(
    private cd: ChangeDetectorRef,
    protected router: Router,
    protected dataService: DataService,
    protected route: ActivatedRoute
  ) {
    [
      this.dataService.watchItem('service').subscribe((value: any) => {
        if (value) {
          this.changeBackground(value);
        }
      })
    ].map(sub => this.subscriptions.add(sub));
  }

  changeBackground(service) {
    switch (service) {
      case 'bambora':
        setTimeout(() => {
          document.body.classList.add('bambora');
          document.body.classList.remove('stripe');
        }, 100);
        break;
      case 'stripe':
      default:
        setTimeout(() => {
          document.body.classList.add('stripe');
          document.body.classList.remove('bambora');
        }, 100);
        break;
    }
  }

  test() {
    this.cd.detectChanges();
  }

  setPrice(event: any) {
    this.price = event;
  }

  addData(data: any) {
    this.dataList.push(data);
  }

  onSetupChange(event: any) {
    this._setupData.next(event);
    this.cd.detectChanges();
  }

  onProfileChange(event: any) {
    this._profileData.next(event);
    this.cd.detectChanges();
  }

  navTo(route: any) {
    this.router.navigate([route]);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
