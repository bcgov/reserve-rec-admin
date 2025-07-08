import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { SearchService } from '../services/search.service';
import { LoadingService } from '../services/loading.service';

@Component({
  selector: 'app-inventory-component',
  imports: [CommonModule, NgdsFormsModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {
  public form;

  constructor(
    protected searchService: SearchService,
    protected loadingService: LoadingService
  ) {

  }

  ngOnInit() {
    this.form = new UntypedFormGroup({
      search: new UntypedFormControl(''),
    })
  }

  async search() {
    const query = this.form.get('search').value;
    const res = await this.searchService.searchByQuery(query);
    console.log('res:', res);
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