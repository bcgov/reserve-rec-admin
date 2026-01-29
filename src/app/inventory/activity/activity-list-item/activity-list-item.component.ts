import { Component, Input, OnInit } from '@angular/core';
import { Constants } from '../../../app.constants';
import { CommonModule, TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-activity-list-item',
  imports: [TitleCasePipe, CommonModule],
  templateUrl: './activity-list-item.component.html',
  styleUrl: './activity-list-item.component.scss'
})
export class ActivityListItemComponent implements OnInit {
  @Input() activity: any;
  @Input() showDetailsButton: boolean = true;

  public constantsData = null;

  ngOnInit(): void {
    this.constantsData = Constants.activityTypes[this.activity?.activityType] || { displayName: 'Unknown', icon: 'question-circle' };
  }

  navigateToActivity(activity: any) {
    const activityUrl = `/inventory/activity/${activity.collectionId}/${activity.activityType}/${activity.activityId}`;
    window.open(activityUrl, '_blank');
  }

}
