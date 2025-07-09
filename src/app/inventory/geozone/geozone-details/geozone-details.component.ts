import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, Input, OnInit, Signal } from '@angular/core';

@Component({
  selector: 'app-geozone-details',
  imports: [CommonModule, UpperCasePipe, DatePipe],
  templateUrl: './geozone-details.component.html',
  styleUrl: './geozone-details.component.scss'
})
export class GeozoneDetailsComponent {
  @Input() set _data(value: any) {
    this.data = value;
  }
  public data: any = null;

  stringifyData(data: any): string {
    return JSON.stringify(data, null, 2);
  }

}
