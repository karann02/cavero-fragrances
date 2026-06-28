// services/permission.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PERMISSIONS } from '../constants/permissions.const';
import { BehaviorSubject } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private loaded$ = new BehaviorSubject<boolean>(false);
  private permissions: any;

  constructor(private http: HttpClient) { }



  load(): void {

  }

  isLoaded$() {
    return this.loaded$.asObservable();
  }
}