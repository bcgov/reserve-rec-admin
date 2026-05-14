import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CollectionService } from '../../../services/collection.service';
import { PermissionDirective } from '../../../shared/directives/permission.directive';

@Component({
  selector: 'app-collection-details',
  imports: [CommonModule, DatePipe, PermissionDirective],
  templateUrl: './collection-details.component.html',
  styleUrl: './collection-details.component.scss'
})
export class CollectionDetailsComponent implements OnInit {
  public collection: any;

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected collectionService: CollectionService,
  ) { }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      if (data?.['collection']) {
        this.collection = data['collection'];
      }
    });
  }
}
