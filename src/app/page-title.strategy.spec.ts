import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { PageTitleStrategy } from './page-title.strategy';

@Component({ template: '' })
class BlankComponent { }

describe('PageTitleStrategy', () => {
  let harness: RouterTestingHarness;
  let title: Title;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'customers', title: 'Customers', component: BlankComponent },
          { path: 'untitled', component: BlankComponent }
        ]),
        { provide: TitleStrategy, useClass: PageTitleStrategy }
      ]
    });
    harness = await RouterTestingHarness.create();
    title = TestBed.inject(Title);
  });

  it('appends the site name to the route title', async () => {
    await harness.navigateByUrl('/customers');
    expect(title.getTitle()).toBe('Customers | BC Parks Admin');
  });

  it('shows the site name alone when the route has no title', async () => {
    await harness.navigateByUrl('/untitled');
    expect(title.getTitle()).toBe('BC Parks Admin');
  });
});
