import { AfterViewInit, ChangeDetectorRef, Component, computed, ElementRef, Input, Signal, ViewChild, WritableSignal, effect, signal } from '@angular/core';
import { DataService } from '../../services/data.service';
import { Subscription } from 'rxjs';
import { Constants } from '../../app.constants';
import { SearchResultComponent } from './search-result/search-result.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search-results-table',
  imports: [CommonModule, SearchResultComponent],
  templateUrl: './search-results-table.component.html',
  styleUrl: './search-results-table.component.scss'
})
export class SearchResultsTableComponent implements AfterViewInit {
  @ViewChild('resultsContainer') resultsContainer: ElementRef;
  @Input() height: string = '500px'; // Default height for the results container
  public _resultsSignal: WritableSignal<any[]> = signal([]);
  public subscriptions = new Subscription();
  // Computed (not a plain field mutated inside an effect) so the template's
  // *ngFor sees every update through Angular's normal signal-read tracking
  // instead of a plain field written from outside the zone, which could
  // leave the DOM showing stale results indefinitely.
  public results: Signal<any[]> = computed(() => this._resultsSignal()?.map(result => {
    if (result?._source) {
      return result._source;
    }
    return result;
  }) || []);
  public maxHeight: string = '';

  constructor(
    protected dataService: DataService,
    protected cdr: ChangeDetectorRef
  ) {
    this._resultsSignal = this.dataService.watchItem(Constants.dataIds.SEARCH_RESULTS);
    effect(() => {
      this.results();
      this.getMaxHeight();
      // effect() callbacks run outside Angular's zone, on their own
      // microtask schedule. Nothing guarantees a zone-triggered change
      // detection pass runs afterwards, so without forcing one here this
      // component's view can sit showing stale results indefinitely even
      // though `results()` has already updated (#346).
      this.cdr.detectChanges();
    });
  }

  resizeResultsContainer() {
    // if (this.resultsContainer) {
    //   console.log('this.resultsContainer.nativeElement.parentElement:', this.resultsContainer.nativeElement.parentElement.parentElement);
    //   const parentHeight = this.resultsContainer.nativeElement.parentElement?.parentElement?.clientHeight;
    //   this.resultsContainer.nativeElement.style.maxHeight = parentHeight;
    // }
  }

  getMaxHeight() {
    const parentHeight = this.resultsContainer?.nativeElement?.parentElement?.parentElement?.clientHeight;
    this.maxHeight =  parentHeight ? `${parentHeight}px !important` : '500px !important';
  }

  ngAfterViewInit(): void {
    this.resizeResultsContainer();
  }

  trackByResult(index: number, result: any) {
    return result?.pk && result?.sk ? `${result.pk}#${result.sk}` : index;
  }
}
