import { Component, Input } from '@angular/core';
import { AbstractControl, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { EditorComponent, TINYMCE_SCRIPT_SRC } from '@tinymce/tinymce-angular';

@Component({
  selector: 'app-wysiwyg-input',
  templateUrl: './wysiwyg-editor.component.html',
  styleUrls: ['./wysiwyg-editor.component.scss'],
  standalone: true,
  imports: [EditorComponent, ReactiveFormsModule],
  providers: [
    {
      provide: TINYMCE_SCRIPT_SRC,
      useValue: 'tinymce/tinymce.min.js'
    }
  ]
})
export class WysiwygInputComponent {
  @Input() control: AbstractControl;
  @Input() placeholder: string = 'Type here...';

  get formControl(): UntypedFormControl {
    return this.control as UntypedFormControl;
  }

  get editorConfig() {
    return {
      base_url: '/tinymce',
      branding: false,
      iframe_aria_text: 'Rich text editor',
      placeholder: this.placeholder,
      plugins: 'lists link image wordcount',
      promotion: false,
      suffix: '.min',
      toolbar: 'fontsize | undo redo | bold italic underline | bullist numlist | aligncenter alignjustify alignleft alignnone alignright | link image | removeformat | help',
    };
  }
}
