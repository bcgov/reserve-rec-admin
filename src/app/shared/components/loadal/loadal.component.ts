import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import * as bootstrap from 'bootstrap/dist/js/bootstrap.esm.min.js';

@Component({
  selector: 'app-loadal',
  imports: [],
  templateUrl: './loadal.component.html',
  styleUrl: './loadal.component.scss'
})
export class LoadalComponent implements AfterViewInit, OnDestroy {
  @ViewChild('loadal') loadalElement: ElementRef<HTMLElement> | undefined;

  public loadal;
  private isViewInitialized = false;
  private showDepth = 0;

  constructor() {}

  ngAfterViewInit(): void {
    // Disable if working locally
    // I think if we're locally building, it's Ricky Bobby fast
    // And that's why the spinner just hangs forever (loads before we can hide it)
    if (window.location.hostname === 'localhost') {
      return;
    }
    
    if (this.loadalElement?.nativeElement) {
      this.loadal = new bootstrap.Modal(this.loadalElement.nativeElement, { animation: false });
      this.isViewInitialized = true;
    }
  }

  show() {
    this.showDepth += 1;
    if (this.isViewInitialized && this.loadal && this.showDepth === 1) {
      this.loadal.show();
    }
  }

  hide() {
    this.showDepth = Math.max(0, this.showDepth - 1);
    if (this.isViewInitialized && this.loadal && this.showDepth === 0) {
      this.loadal.hide();
    }
  }

  dispose() {
    this.loadal?.dispose();
  }

  ngOnDestroy(): void {
    this.showDepth = 0;
    this.hide();
    this.dispose();
  }
}
