import { Component } from '@angular/core';
import { ConfigService } from '../services/config.service';

@Component({
    selector: 'app-footer',
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.scss'
})
export class FooterComponent {
    public envName: string;

    constructor(
        protected configService: ConfigService,
    ) {

        this.envName = this.configService.config['ENVIRONMENT'];
    }

}
