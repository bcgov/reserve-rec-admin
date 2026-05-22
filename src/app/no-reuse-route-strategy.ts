import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';

// Tweaks the default route-reuse so that switching between immediate siblings
// under /inventory/create (e.g. /create/geozone -> /create/facility, or back to
// the home selector at /create) forces the previous child to be destroyed.
// The default outlet behaviour left the previous child mounted alongside the
// new one in this specific subtree (#189, #277 follow-up). Everywhere else
// falls back to Angular's default reuse rules so breadcrumb links and other
// cross-subtree navigations behave normally.
export class NoReuseRouteStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    curr: ActivatedRouteSnapshot,
  ): boolean {
    if (
      future.parent?.routeConfig?.path === 'inventory/create' &&
      curr.parent?.routeConfig?.path === 'inventory/create' &&
      future.routeConfig !== curr.routeConfig
    ) {
      return false;
    }
    return future.routeConfig === curr.routeConfig;
  }
}
