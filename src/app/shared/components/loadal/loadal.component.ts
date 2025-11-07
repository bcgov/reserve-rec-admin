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
    if (this.loadalElement?.nativeElement) {
      this.loadal = new bootstrap.Modal(this.loadalElement.nativeElement);
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
