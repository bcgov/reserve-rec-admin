import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { GeozoneComponent } from './geozone.component';
import { GeozoneService } from '../../services/geozone.service';

describe('GeozoneComponent header', () => {
  async function render(url: string): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [GeozoneComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { data: of({ geozone: { collectionId: 'c', geozoneId: '1', displayName: 'G' } }) } },
        { provide: Router, useValue: { url, navigate: jest.fn(), events: of(), createUrlTree: jest.fn(), serializeUrl: () => '' } },
        { provide: GeozoneService, useValue: {} },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(GeozoneComponent);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  const buttonLabels = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());

  it('shows Edit on the details page', async () => {
    expect(buttonLabels(await render('/inventory/geozone/c/1'))).toContain('Edit');
  });

  it('hides Edit on the edit page', async () => {
    expect(buttonLabels(await render('/inventory/geozone/c/1/edit'))).not.toContain('Edit');
  });
});
