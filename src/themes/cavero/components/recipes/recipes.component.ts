import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Recipe {
  title: string;
  image: string;
  time: string;
  difficulty: string;
  portions: string;
  link: string;
}

@Component({
  selector: 'app-cavero-recipes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recipes.component.html',
  styleUrls: ['./recipes.component.scss']
})
export class CaveroRecipesComponent {
  recipes: Recipe[] = [
    {
      title: 'Garden salad with a mix of lettuce, cucumber and tomato',
      image: 'assets/cavero/img/home/grocery/recipes/01.jpg',
      time: '30 min',
      difficulty: 'Easy',
      portions: '4 por',
      link: '/recipe/1'
    },
    {
      title: 'Raspberry fresh lemonade with lemon, strawberry syrup and mint',
      image: 'assets/cavero/img/home/grocery/recipes/02.jpg',
      time: '50 min',
      difficulty: 'Hard',
      portions: '8 por',
      link: '/recipe/2'
    },
    {
      title: 'Penne pasta with spinach and zucchini in a creamy sauce',
      image: 'assets/cavero/img/home/grocery/recipes/03.jpg',
      time: '25 min',
      difficulty: 'Easy',
      portions: '2 por',
      link: '/recipe/3'
    }
  ];
}