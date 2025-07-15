import { AfterViewChecked, ChangeDetectorRef, Component, ContentChildren, effect, OnChanges, OnDestroy, OnInit, signal, SimpleChanges, ViewChild, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { SearchService } from '../services/search.service';
import { LoadingService } from '../services/loading.service';
import { MapComponent } from '../map/map.component';
import { Constants } from '../app.constants';
import { DataService } from '../services/data.service';
import { SearchResultComponent } from './search-results-table/search-result/search-result.component';
import { InventorySearchComponent } from './inventory-search/inventory-search.component';

@Component({
  selector: 'app-inventory-component',
  imports: [InventorySearchComponent, CommonModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent {

}