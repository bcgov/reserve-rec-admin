import { DatePipe } from '@angular/common';
import { Component, effect, Input, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-protected-areas',
  imports: [DatePipe],
  templateUrl: './protected-area-details.component.html',
  styleUrl: './protected-area-details.component.scss'
})
export class ProtectedAreaDetailsComponent  {
  public _protectedAreaDataSignal: WritableSignal<any[]> = signal([]);
  public protectedArea;

  constructor(
    protected route: ActivatedRoute,
    protected router: Router
  ) {
    this.route.data.subscribe((data) => {
      if (data?.['protectedArea']?.data) {
        this._protectedAreaDataSignal.set(data['protectedArea'].data);
      }
    })
    effect(() => {
      this.protectedArea = this._protectedAreaDataSignal();
    })
  }

  getSearchTermsDisplay(): string {
    const terms = this.protectedArea?.searchTerms;
    if (!terms || (Array.isArray(terms) && terms.length === 0)) {
      return '(No search terms added)';
    }
    if (Array.isArray(terms)) {
      return terms.join(', ');
    }
    if (typeof terms === 'string') {
      return terms.replaceAll(',', ', ');
    }
    return '(No search terms added)';
  }

  editPark() {
    this.router.navigate(['./edit'], { relativeTo: this.route });
  }
}

