import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './home.component';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';

@NgModule({
  declarations: [HomeComponent],
  imports: [
    CommonModule,
    NgdsFormsModule,
  ],
  exports: [HomeComponent],
})
export class HomeModule {}
