# Testing the app: the every-time checklist

All commands run in PowerShell from `C:\Users\daniu\source\repos\kids-over-profits-mobile`.

## 1. Get the latest code

```powershell
git pull
npm install
```

`npm install` only matters when `package.json` changed, but it is quick when nothing did.

## 2. Open the app on your phone

**The quick way:** double-click **KOP app on phone** on the desktop. It does step 1 (and `npm install`
only when the package list changed), starts Expo, and when Expo stops offers T to retry over the
internet. Lost the shortcut? `powershell -ExecutionPolicy Bypass -File scripts\make-phone-shortcut.ps1`.
The steps it runs, by hand:

1. On the phone, install **Expo Go** from the App Store or Google Play (once; keep it updated, the app needs SDK 57).
2. On the PC:
   ```powershell
   npx expo start
   ```
3. Scan the QR code: with the Camera app on iPhone, or from inside Expo Go on Android.
4. If the phone can't connect (different Wi-Fi, VPN on), stop it with `Ctrl+C` and run:
   ```powershell
   npx expo start --tunnel
   ```

The app loads live data from kidsoverprofits.org, so the site must be up.

## 3. While it's running

- **Save a file** and the phone reloads by itself.
- **Reload by hand:** press `r` in the terminal, or shake the phone and tap Reload.
- **Something stuck:** stop with `Ctrl+C`, then `npx expo start --clear`.
- **Stop:** `Ctrl+C`.

## 4. What to look at

- Search a facility by an old name ("Copper Canyon") and open it.
- A renamed program shows one "As <name>" section per name.
- A program with homes (Newport Academy, California) lists its homes; a home names its program.
- News tab scrolls and loads more; Companies tab lists every company and opens one.
- Falcon Ridge Ranch: tap a "source" under Leslie Budd; the Woodbury issue opens in the app at page 21. Tap "Open the document library"; folders open, a document opens in the app.
- Send tab: try one link; it should show up in KOP Tools > Review inbox.
- Turn the phone's text size up and check nothing is cut off.

Write down anything that reads wrong, with the facility name.

## 5. Before pushing a change

```powershell
npm run typecheck
npx expo lint
npm test
```

All three must pass. Then:

```powershell
git add <the files you changed>
git commit -m "what changed"
git pull --rebase
git push
```

## 6. Only when the site's API changed

The tests use saved copies of real API answers in `__tests__/fixtures/`. After a change to
`inc/mobile-api.php` (theme repo), refresh them from the theme repo:

```powershell
cd C:\Users\daniu\source\repos\Kids-Over-Profits
& "$env:LOCALAPPDATA\Programs\Local\resources\extraResources\lightning-services\php-8.2.27+1\bin\win32\php.exe" -d extension=pdo_sqlite -d extension=mbstring scripts/test-mobile-api.php --db=tmp/prod.sqlite --id=9605,9606,9607,12155,12161,100284,9758,10371,10865,12688,9688 --dump=C:\tmp\kop-dump
Copy-Item C:\tmp\kop-dump\*.json C:\Users\daniu\source\repos\kids-over-profits-mobile\__tests__\fixtures\
Copy-Item C:\tmp\kop-dump\operators.json C:\Users\daniu\source\repos\kids-over-profits-mobile\scripts\shot-fixtures\
```

Then run step 5 again. (If the PHP path fails, Local was updated: look in
`...\lightning-services\` for the new `php-*` folder name.)

## 7. Optional: screenshots without a phone

```powershell
npm run shots
```

Pictures of every screen land in `tmp\shots\`. Add `-- --only=companies,facility-12155` for just those.

## Later: an installable Android build (no Expo Go)

Needs a free Expo account, once: `npx eas-cli@latest login`. Then:

```powershell
npx eas-cli@latest build --profile preview --platform android
```

It prints a link to an APK you can install on an Android phone. Sharing a link *into* the app from
another app only works in a build like this, not in Expo Go.

## Updating an installed build without reinstalling (EAS Update)

An installed build (made after `expo-updates` was added) fetches new code by itself. Every push to
`main` that changes `src/` or `assets/` publishes it to the preview channel on its own (GitHub Actions,
`.github/workflows/eas-update.yml`, using the repository secret `EXPO_TOKEN`). A push that also changes
`package.json`, `app.json` or `eas.json` is skipped with a warning, because it needs a new build. To
publish by hand instead:

```powershell
git pull
npx eas-cli@latest update --channel preview --environment preview --message "what changed"
```

On the phone, close the app fully (swipe it away), open it, wait a few seconds, then close and open
it once more. The first open downloads the update and the second one runs it.

A new build is still needed (`eas build`, then install it) when:
- a package with native code was added or upgraded, or the Expo SDK was upgraded;
- `app.json` changed in a way that affects the build (icons, permissions, plugins, links);
- `version` in `app.json` was raised (updates only reach builds of the same version).

Builds from the `production` profile listen on the `production` channel instead: publish with
`--channel production --environment production`.
