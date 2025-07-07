import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'parks-management-component',
  imports: [CommonModule],    
  templateUrl: './parks-managment.component.html',
  styleUrls: ['./parks-managment.component.scss']
})
export class ParksManagementComponent {
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