import { Component, WritableSignal, effect, signal } from '@angular/core';
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
export class SearchResultsTableComponent {
  public _resultsSignal: WritableSignal<any[]> = signal([]);
  public subscriptions = new Subscription();
  public results: any[] = [];

  constructor(
    protected dataService: DataService
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
  }
}
