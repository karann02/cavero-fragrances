import { Route } from "@angular/router";
import { SigninComponent } from "./signin/signin.component";
import { ForgotPasswordComponent } from "./forgot-password/forgot-password.component";
import { ResetPasswordComponent } from "./reset-password/reset-password.component";
import { LockedComponent } from "./locked/locked.component";
import { Page404Component } from "./page404/page404.component";
import { Page500Component } from "./page500/page500.component";
import { RedirectNot } from "./redirect-note/redirect-note.component";

export const AUTH_ROUTE: Route[] = [
  {
    path: "",
    redirectTo: "signin",
    pathMatch: "full",
  },
  {
    path: "signin",
    component: SigninComponent,
    data: {
      seoTitle: "Admin Sign In | Cavero Fragrances",
      seoDescription: "Admin portal sign in for Cavero Fragrances.",
      seoKeywords: "admin signin, authentication",
      robots: "noindex,nofollow"
    }
  },
  
  {
    path: "forgot-password",
    component: ForgotPasswordComponent,
    data: {
      seoTitle: "Forgot Password | Cavero Fragrances",
      seoDescription: "Reset your account password securely.",
      seoKeywords: "forgot password, reset password",
      robots: "noindex,nofollow"
    }
  },
  {
    path: "reset-password",
    component: ResetPasswordComponent,
    data: {
      seoTitle: "Reset Password | Cavero Fragrances",
      seoDescription: "Create a new password for your Cavero account securely.",
      seoKeywords: "reset password, new password",
      robots: "noindex,nofollow"
    }
  },
  {
    path: "locked",
    component: LockedComponent,
    data: {
      seoTitle: "Account Locked | Cavero Fragrances",
      seoDescription: "Your account is currently locked.",
      seoKeywords: "account locked",
      robots: "noindex,nofollow"
    }
  },
  {
    path: "page404",
    component: Page404Component,
    data: {
      seoTitle: "Page Not Found | Cavero Fragrances",
      seoDescription: "The page you are looking for could not be found.",
      seoKeywords: "404, page not found",
      robots: "noindex,nofollow"
    }
  },
  {
    path: "page500",
    component: Page500Component,
    data: {
      seoTitle: "Server Error | Cavero Fragrances",
      seoDescription: "An unexpected server error occurred.",
      seoKeywords: "500, server error",
      robots: "noindex,nofollow"
    }
  },
    {
    path: "redirect-note",
    component: RedirectNot,
    data: {
      seoTitle: "Redirect Notice | Cavero Fragrances",
      seoDescription: "Redirect information page.",
      seoKeywords: "redirect notice",
      robots: "noindex,nofollow"
    }
  },
  
];
