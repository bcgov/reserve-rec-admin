import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'search-component',
    imports: [CommonModule],
    templateUrl: './search.component.html',
    styleUrl: './search.component.scss'
})
export class SearchComponent {
    onSearch() {
        console.log('searching');
    }

}
