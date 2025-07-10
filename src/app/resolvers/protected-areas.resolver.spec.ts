import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { protectedAreasResolver } from './protected-areas.resolver';

describe('protectedAreasResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => protectedAreasResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
