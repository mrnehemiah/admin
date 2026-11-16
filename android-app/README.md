# ZUNE Admin Android App

This standalone Android wrapper opens the ZUNE Admin seller-management page:

- https://mrnehemiah.github.io/admin/#sellers

## Build

The GitHub Actions workflow `.github/workflows/build-zune-admin-android.yml` builds a debug APK on pushes affecting this Android project or when manually dispatched.

The workflow uploads an artifact named `ZUNE-Admin-APK`.

## Notes

- Package: `com.zune.admin`
- The Admin web application and its Supabase backend remain in the existing Admin repository.
- This Android wrapper does not bypass Admin authentication or Supabase Row Level Security.
- External websites open outside the WebView; only the Admin GitHub Pages path is kept inside the app.
- This debug APK is for device testing, not a signed Play Store release.
