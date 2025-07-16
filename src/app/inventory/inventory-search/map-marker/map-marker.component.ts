import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { firstValueFrom, Subject } from 'rxjs';

@Component({
  selector: 'app-map-marker',
  imports: [CommonModule],
  templateUrl: './map-marker.component.html',
  styleUrl: './map-marker.component.scss'
})
export class MapMarkerComponent implements AfterViewInit {
  @ViewChild('markerTemplate') markerTemplate!: ElementRef<HTMLElement>;
  @ViewChild('tooltip') tooltip!: TemplateRef<HTMLElement>;
  @Input() markerData = null;
  @Input() markerOptions: any = {};

  public _markerHTML = new Subject<HTMLElement>();
  public popper: any = null;


  ngAfterViewInit(): void {
    this._markerHTML.next(this.markerTemplate?.nativeElement);
  }

  createPopper() {
  }

  destroyPopper() {
    if (this.popper) {
      this.popper = null;
    }
  }

  show() {
  }

  hide() {
  }

  async getTemplate() {
    return await firstValueFrom(this._markerHTML);
  }
}
