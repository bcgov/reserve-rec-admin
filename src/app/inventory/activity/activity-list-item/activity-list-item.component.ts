import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-activity-list-item',
  imports: [CommonModule],
  templateUrl: './activity-list-item.component.html',
  styleUrl: './activity-list-item.component.scss'
})
export class ActivityListItemComponent {
  @Input() activity: any;
  @Input() isEditing: boolean = false;
  @Output() activityRemoved = new EventEmitter<any>();

  removeActivity(policy: any) {
    this.activityRemoved.emit(policy);
  }

  navigateToActivity(activity: any) {
    const activityUrl = `/inventory/activity/${activity.collectionId}/${activity.activityType}/${activity.activityId}`;
    window.open(activityUrl, '_blank');
  }

}
