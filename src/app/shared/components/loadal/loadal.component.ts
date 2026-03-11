import { AfterViewInit, Component, effect, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import * as bootstrap from 'bootstrap/dist/js/bootstrap.esm.min.js';
import { LoadingService } from '../../../services/loading.service';

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

  constructor(
    protected loadingService: LoadingService
  ) {
  }

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
    if (this.isViewInitialized && this.loadal) {
      this.loadal.show();
    }
  }

  hide() {
    if (this.isViewInitialized && this.loadal) {
      this.loadal.hide();
    }
  }

  dispose() {
    this.loadal?.dispose();
  }

  ngOnDestroy(): void {
    this.hide();
    this.dispose();
  }
}
