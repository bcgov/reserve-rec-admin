import { ActivatedRouteSnapshot, ResolveFn, Router, RouterStateSnapshot } from '@angular/router';
import { PolicyService } from '../services/policy.service';
import { inject } from '@angular/core';

export const policyResolver: ResolveFn<any> = async (route: ActivatedRouteSnapshot, router: RouterStateSnapshot) => {
  const policyService = inject(PolicyService);

  const params = {};
  let currentRoute = router.root

  // Get all parameters from the route
  while (currentRoute) {
    for (const key of currentRoute.paramMap.keys) {
      params[key] = currentRoute.paramMap.get(key);
    }
    currentRoute = currentRoute.firstChild;
  }


  const policyType = params['policyType'];
  const policyId = params['policyId'];
  const policyIdVersion = params['policyIdVersion'] || 'latest';

  const policy = await policyService.getPolicy(policyType, policyId, policyIdVersion);


  return policy?.items?.[0] || policy;
};
