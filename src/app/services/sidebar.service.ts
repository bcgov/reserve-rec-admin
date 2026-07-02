import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  // Mobile sidebar open/closed state. Desktop ignores this (sidebar always
  // shown via CSS). The header hamburger toggles it; the sidebar subscribes.
  public isOpen$ = new BehaviorSubject<boolean>(false);

  toggle() {
    this.isOpen$.next(!this.isOpen$.value);
  }

  close() {
    this.isOpen$.next(false);
  }
}
