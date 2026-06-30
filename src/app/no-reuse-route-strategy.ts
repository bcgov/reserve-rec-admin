import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';

// On browser back/forward (popstate) the router-outlet under /inventory/create
// could keep the previously-selected create form mounted instead of activating
// the route the URL now points at — the navigation completes (URL + breadcrumb
// update) but the child outlet never swaps (#189).
//
// Forcing the whole /inventory/create subtree to re-create whenever its active
// child changes guarantees the outlet renders the correct child on every
// transition — imperative links, the breadcrumb, and browser back/forward
// alike. The previous version keyed off the *child* node, which made it a
// no-op (it returned false only when the default strategy already did), so it
// never actually changed the outlet behaviour.
//
// Everywhere else falls back to Angular's default reuse rules.
export class NoReuseRouteStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    curr: ActivatedRouteSnapshot,
  ): boolean {
    if (
      future.routeConfig?.path === 'inventory/create' &&
      curr.routeConfig?.path === 'inventory/create' &&
      (future.firstChild?.routeConfig ?? null) !== (curr.firstChild?.routeConfig ?? null)
    ) {
      return false;
    }
    return future.routeConfig === curr.routeConfig;
  }
}
