import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { SearchService } from '../services/search.service';
import { LoadingService } from '../services/loading.service';
import { SearchResultsTableComponent } from './search-results-table/search-results-table.component';

@Component({
  selector: 'app-inventory-component',
  imports: [CommonModule, NgdsFormsModule, SearchResultsTableComponent],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {
  public form;

  constructor(
    protected searchService: SearchService,
    protected loadingService: LoadingService,
    protected cdr: ChangeDetectorRef
  ) {

  }

  ngOnInit() {
    this.form = new UntypedFormGroup({
      search: new UntypedFormControl(''),
    })
  }

  async search() {
    const query = this.form.get('search').value;
    const searchValue = this.form.get('search');
    const res = await this.searchService.searchByQuery(query);
    this.cdr.detectChanges();
  }


  goToPark() {
    console.log('Go to park');
  }

  showAlerts() {
    console.log('Show alerts');
  }

  showClosures() {
    console.log('Show closures');
  }
}