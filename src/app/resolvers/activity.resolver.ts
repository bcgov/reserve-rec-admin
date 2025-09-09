import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { ActivityService } from '../services/activity.service';

@Injectable({ providedIn: 'root' })
export class ActivityResolver implements Resolve<any> {
  constructor(private ActivityService: ActivityService) {}

  resolve(route: ActivatedRouteSnapshot) {
    // Check current route first, then parent route for parameters
    const collectionId = route.paramMap.get('collectionId') || route.parent?.paramMap.get('collectionId');
    const activityType = route.paramMap.get('activityType') || route.parent?.paramMap.get('activityType');
    const activityId = route.paramMap.get('activityId') || route.parent?.paramMap.get('activityId');
    const activity = this.ActivityService.getActivity(collectionId, activityType, activityId);
    return activity;
  }
}
