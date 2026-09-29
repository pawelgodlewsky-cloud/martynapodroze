# Formularz wyceny

Formularz na stronie głównej wysyła POST na `/api/inquiry`. Cloudflare Worker
sprawdza dane i przekazuje wiadomość przez istniejące konto Resend na
`podroz.martyna@gmail.com`. Reply-To zawiera adres osoby wysyłającej zgłoszenie.
Nie wysyłamy automatycznych odpowiedzi na niezweryfikowane adresy odwiedzających.

Wymagane sekrety i zmienne są takie same jak przy mailach z przewodnikami:
`RESEND_API_KEY`, `TRANSACTIONAL_FROM_EMAIL`, `VISITOR_SALT` i binding `DB`.
Klucz Resend pozostaje w Workerze, nigdy w HTML ani JavaScript przeglądarki.

Ochrona przed spamem: pole-pułapka, walidacja i limit pięciu prób na godzinę
z jednego IP. D1 przechowuje wyłącznie liczniki i HMAC adresu IP, usuwane przy
obsłudze kolejnych zgłoszeń po 48 godzinach. Treść zgłoszenia nie jest zapisywana
w D1 ani logach Workera. Resend otrzymuje klucz idempotencji; ponowienie tej
samej próby z tymi samymi danymi nie tworzy drugiego maila przez 24 godziny.

Przekierowanie na `/dziekujemy.html` następuje dopiero po potwierdzeniu przyjęcia
wiadomości przez Resend. To nie jest potwierdzenie dostarczenia do skrzynki:
status doręczenia można sprawdzić w panelu Resend. Przy błędzie użytkownik widzi
komunikat, zachowuje dane w formularzu i może ponowić wysyłkę lub napisać e-mail.
Bez JavaScript endpoint obsługuje zwykły POST formularza; błąd pokazuje osobną
stronę z linkiem powrotu i adresem kontaktowym.

## Wdrożenie

1. `npm run check`
2. `npx wrangler d1 migrations apply martyna-wyjazdy --remote`
3. `npx wrangler deploy` (dodaje również trasę `/api/inquiry*`)
4. Opublikuj zmienioną stronę główną, `assets/inquiry-form.js` i politykę
   prywatności w GitHub Pages. Backend należy opublikować przed frontendem.
5. Wyślij jedno oznaczone zgłoszenie testowe i sprawdź jego status w Resend.

Nie publikuj nowego frontendu przed uruchomieniem endpointu, bo odpowiedź
GitHub Pages na POST nie potwierdza wysłania wiadomości.
