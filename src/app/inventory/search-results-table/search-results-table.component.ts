import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, ViewChild, WritableSignal, effect, signal } from '@angular/core';
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
  public results: any[] = [];
  public maxHeight: string = '';

  constructor(
    protected dataService: DataService,
    protected cdr: ChangeDetectorRef
  ) {
    this._resultsSignal = this.dataService.watchItem(Constants.dataIds.SEARCH_RESULTS);
    effect(() => {
      this.formatResults();
    });
  }

  formatResults() {
    this.results = this._resultsSignal()?.map(result => {
      if (result?._source) {
        return result._source;
      }
      return result;
    });
    this.getMaxHeight();
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
}
