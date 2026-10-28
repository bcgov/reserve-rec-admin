import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const SITE_TITLE = 'BC Parks Admin';

export function pageTitle(name?: string): string {
  return name ? `${name} | ${SITE_TITLE}` : SITE_TITLE;
}

@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.title.setTitle(pageTitle(this.buildTitle(snapshot)));
  }
}
