import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError, from } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // If token is already expired and request is to backend (not auth endpoint), refresh proactively!
  if (token && authService.isTokenExpired(token) && req.url.includes('localhost:3000') && !req.url.includes('/auth/')) {
    return from(authService.refreshToken()).pipe(
      switchMap((newToken) => {
        const bearer = newToken || token;
        const cloned = req.clone({
          setHeaders: {
            Authorization: `Bearer ${bearer}`,
          },
        });
        return next(cloned);
      }),
      catchError(() => {
        // If refresh fails, proceed with original request (backend will return 401)
        return next(req);
      }),
    );
  }

  let reqToSend = req;
  if (token && req.url.includes('localhost:3000')) {
    reqToSend = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(reqToSend).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 occurs on an application endpoint, attempt refresh and retry once!
      if (
        error.status === 401 &&
        req.url.includes('localhost:3000') &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/refresh') &&
        !req.url.includes('/auth/register')
      ) {
        return from(authService.refreshToken()).pipe(
          switchMap((newToken) => {
            if (newToken) {
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`,
                },
              });
              return next(retryReq);
            }
            return throwError(() => error);
          }),
          catchError((refreshErr) => throwError(() => error)),
        );
      }
      return throwError(() => error);
    }),
  );
};
