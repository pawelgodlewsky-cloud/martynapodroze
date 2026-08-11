# Moduł indywidualnych propozycji wyjazdów

Moduł został dodany bez migracji istniejącej strony. Strona główna nadal może
być serwowana przez obecny GitHub Pages, a osobny Cloudflare Worker przejmuje
wyłącznie trasy:

- `/admin/wyjazdy*`
- `/api/admin/*`
- `/w/*`
- `/go/*`

Worker korzysta z D1 przez binding `DB`. R2 nie jest potrzebne — moduł nie
przyjmuje uploadów i używa istniejących zasobów marki.

## Pierwsze wdrożenie

1. Zainstaluj zależności:

   ```powershell
   npm install
   ```

2. Produkcyjna baza `martyna-wyjazdy` została utworzona w regionie EEUR, a jej
   identyfikator jest zapisany w `wrangler.toml`. Polecenie tworzenia bazy jest
   potrzebne tylko przy stawianiu nowego środowiska:

   ```powershell
   npx wrangler login
   npx wrangler d1 create martyna-wyjazdy
   ```

3. Migracje `0001_trips.sql` i `0002_admin_auth.sql` zostały zastosowane na
   produkcji. Kolejne
   migracje stosuj poleceniem:

   ```powershell
   npx wrangler d1 migrations apply martyna-wyjazdy --remote
   ```

4. Panel nie wymaga Cloudflare Zero Trust. Worker obsługuje logowanie e-mail +
   hasło, wystawia podpisaną sesję `HttpOnly`, sprawdza źródło żądań i ogranicza
   nieudane próby logowania w D1. E-mail administratora jest ustawiony w
   `wrangler.toml` jako `ADMIN_EMAIL`. Hasło i klucz sesji są sekretami Workera:

   ```powershell
   npx wrangler secret put ADMIN_PASSWORD
   npx wrangler secret put SESSION_SECRET
   ```

5. Losowy sekret używany wyłącznie do jednokierunkowego skracania
   identyfikatora statystycznego:

   `VISITOR_SALT` jest już ustawiony w produkcyjnym Workerze. Nie jest zapisany
   w repozytorium. Moduł nie zapisuje IP, user-agenta, e-maila ani innych
   danych osobowych.

6. Rekordy apex domeny są proxowane przez Cloudflare (pomarańczowa chmurka),
   dzięki czemu trasy Workera działają przed originem GitHub Pages. Worker nie
   przejmuje homepage ani innych URL-i.

7. Worker został wdrożony. Kolejne wersje publikuj po kontroli jakości:

   ```powershell
   npm run check
   npx wrangler deploy
   ```

Po wdrożeniu sprawdź, że `/admin/wyjazdy/` przekierowuje na formularz logowania,
a niezalogowane wywołanie `/api/admin/trips` zwraca 401.

## Uruchomienie lokalne

```powershell
npx wrangler d1 migrations apply DB --local
npx wrangler dev --local
```

Lokalny plik `.dev.vars` może zawierać:

```dotenv
ALLOW_LOCAL_ADMIN=1
VISITOR_SALT=lokalny-losowy-sekret-minimum-16-znakow
```

`.dev.vars` jest ignorowany przez Git. `ALLOW_LOCAL_ADMIN` służy wyłącznie do
lokalnego testu i nie wolno ustawiać go w środowisku produkcyjnym.

## Dane i prywatność statystyk

- `trips` przechowuje ofertę, status, slug i daty.
- `trip_links` przechowuje linki dostawców; `/go/[id]` zawsze pobiera URL z D1.
- `trip_events` zapisuje wejścia i kliknięcia bez IP i danych osobowych.
- `admin_login_attempts` przechowuje wyłącznie kluczowany skrót adresu źródłowego
  oraz licznik prób; pełny adres IP nie trafia do D1.
- Opcjonalny cookie statystyczny jest ustawiany dopiero po aktywnej zgodzie
  użytkownika, a jego losowa wartość jest przed zapisem haszowana z sekretem.
- Bez zgody wejścia i kliknięcia nie są zapisywane w `trip_events`.
- Wejścia tej samej przeglądarki są deduplikowane w oknie 30 minut, a szybkie
  podwójne kliknięcia w oknie 2 minut.
- Szkice, oferty wyłączone i wygasłe zwracają 404 na `/w/` oraz `/go/`.

## Kontrola jakości

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run build` wykonuje produkcyjny dry-run Workera i tworzy pakiet w
`.wrangler/build` bez publikowania go.
