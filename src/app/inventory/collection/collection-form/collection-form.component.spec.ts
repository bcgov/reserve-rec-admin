import { UntypedFormBuilder } from '@angular/forms';

import { CollectionFormComponent } from './collection-form.component';

// #388: the collection form set the search-terms value without asking for a
// change-detection pass, so the pill list — and its "No search terms added"
// placeholder — kept rendering the pre-add state. Same cause as the facility
// half fixed in #399. The component is exercised directly: the assertion is
// about the class, and TestBed would drag in the whole template.
describe('CollectionFormComponent search terms', () => {
  function build() {
    const cdr = { detectChanges: jest.fn() };
    const component = new CollectionFormComponent(
      new UntypedFormBuilder(),
      {} as any,
      {} as any,
      cdr as any
    );
    component.buildForm();
    return { component, cdr };
  }

  it('stores the added terms', () => {
    const { component } = build();

    component.onSearchTermsChange(['beach', 'trail']);

    expect(component.form.get('searchTerms')?.value).toEqual(['beach', 'trail']);
    expect(component.form.get('searchTerms')?.dirty).toBe(true);
  });

  it('refreshes the view so the placeholder can clear', () => {
    const { component, cdr } = build();

    component.onSearchTermsChange(['beach']);

    expect(cdr.detectChanges).toHaveBeenCalled();
  });

  it('refreshes again when the last term is removed', () => {
    const { component, cdr } = build();
    component.onSearchTermsChange(['beach']);
    cdr.detectChanges.mockClear();

    component.onSearchTermsChange([]);

    expect(component.form.get('searchTerms')?.value).toEqual([]);
    expect(cdr.detectChanges).toHaveBeenCalled();
  });
});
