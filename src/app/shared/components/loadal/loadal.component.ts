import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import * as bootstrap from 'bootstrap/dist/js/bootstrap.esm.min.js';

@Component({
  selector: 'app-loadal',
  imports: [],
  templateUrl: './loadal.component.html',
  styleUrl: './loadal.component.scss'
})
// 'Loadal' is a stupid portmanteau of 'loading' and 'modal'
// This component is used to display a loading modal when data is being fetched
export class LoadalComponent implements AfterViewInit, OnDestroy{
  @ViewChild('loadal') loadalElement: ElementRef<HTMLElement> | undefined;

  public loadal;

  constructor() {
  }

  ngAfterViewInit(): void {
  if (this.loadalElement?.nativeElement) {
    this.loadal = new bootstrap.Modal(this.loadalElement.nativeElement);
  } else {
    console.error('Loadal element not found');
  }
}

  show() {
    this.loadal?.show();
  }

  hide() {
    this.loadal?.hide();
  }

  dispose() {
    this.loadal?.dispose();
  }

  ngOnDestroy(): void {
    this.hide();
    this.dispose();
  }
}
