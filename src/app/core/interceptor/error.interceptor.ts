import { AuthService } from "../service/auth.service";
import { Injectable } from "@angular/core";
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private authenticationService: AuthService) { }

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((err) => {
        // Never auto-logout on auth endpoints — let the component show the error
        const isAuthEndpoint = /\/(login|signin|google-signin)/.test(request.url);
        if (err.status === 401 && !isAuthEndpoint) {
          this.authenticationService.logout();
          location.reload();
        }
        return throwError(() => err);
      })
    );
  }
}
