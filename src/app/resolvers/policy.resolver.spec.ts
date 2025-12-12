import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { policyResolver } from './policy.resolver';

describe('policyResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => policyResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
