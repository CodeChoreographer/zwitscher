import {Routes} from '@angular/router';
import { HomepageComponent } from './features/homepage/homepage.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import {ChatComponent} from './features/chat/chat.component';
import {ProfileUpdateComponent} from './features/profile/profile-update.component';
import {AuthGuard} from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomepageComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'chat', component: ChatComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfileUpdateComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' }
];
