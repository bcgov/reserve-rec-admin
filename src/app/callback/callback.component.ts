import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-callback',
    templateUrl: './callback.component.html',
    styleUrls: ['./callback.component.scss'],
    standalone: true
})
export class CallbackComponent implements OnInit {

  constructor(private route: ActivatedRoute, private router: Router) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      if (code) {
        // Handle the code, e.g., save it and navigate to another page
        console.log('Code received:', code);
        // Example: this.authService.saveCode(code);
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 1000); // delay for 1 second to ensure code is handled
      } else {
        // Handle the error case
        console.error('No code found in query parameters');
      }
    });
  }
}