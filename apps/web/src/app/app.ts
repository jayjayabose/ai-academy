import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthMenu } from './auth/auth-menu/auth-menu';
import { NotificationBell } from './notifications/notification-bell/notification-bell';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, AuthMenu, NotificationBell],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
