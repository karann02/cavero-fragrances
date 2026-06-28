import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CaveroService } from '../services/cavero.service';

@Component({
  selector: 'app-cavero-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cavero-layout.component.html',
  styleUrls: ['./cavero-layout.component.scss']
})
export class CaveroLayoutComponent implements OnInit, OnDestroy {
  constructor(private caveroService: CaveroService) {}

  ngOnInit() {
    this.caveroService.initializeCavero();
  }

  ngOnDestroy() {
    // Clean up if needed
  }
}