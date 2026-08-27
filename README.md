# Martyna Podróże

Strona internetowa marki **Martyna Podróże** - praktyczne ebooki, przewodniki
i indywidualne wsparcie dla kobiet, które chcą podróżować pewniej solo lub
z rodziną, w rozsądnym budżecie.

## Etap projektu

Aktualnie repozytorium zawiera pierwszą, responsywną wersję strony głównej.
Najważniejszym elementem jest formularz pomagający wybrać odpowiednie wsparcie:

- 4-dniowy interaktywny przewodnik „Lombardia bez stresu” (59 zł promocyjnie, później 79 zł),
- indywidualny plan podróży od A do Z (349 / 549 / 749 zł),
- godzinną konsultację podróżniczą (169 zł na start),
- lotniska wylotu,
- budżetu podróży.

## Uruchomienie lokalne

Stronę można otworzyć bezpośrednio przez plik `index.html` albo uruchomić
lokalny serwer:

```powershell
python -m http.server 4175
```

Następnie otwórz `http://127.0.0.1:4175`.

## Automatyczna liczba obserwujących na Instagramie

Strona odczytuje liczbę obserwujących z pliku `assets/social-proof.json`. Gdy
plik lub sieć są niedostępne, pokazuje bezpieczną wartość zapasową zapisaną w
HTML.

Workflow `.github/workflows/update-instagram-followers.yml` aktualizuje dane co
6 godzin przez oficjalne Instagram Graph API. Aby go uruchomić:

1. Konto `martyna_podroze` musi być kontem profesjonalnym obsługiwanym przez
   Instagram Graph API.
2. W ustawieniach repozytorium GitHub dodaj sekrety `INSTAGRAM_USER_ID` oraz
   `INSTAGRAM_ACCESS_TOKEN`.
3. Opcjonalnie dodaj zmienną repozytorium `META_GRAPH_API_VERSION`; bez niej
   workflow korzysta z `v25.0`.
4. Uruchom workflow ręcznie po pierwszej konfiguracji i sprawdź, czy zmienił
   plik `assets/social-proof.json`.

Token pozostaje wyłącznie w sekretach GitHub i nigdy nie jest wysyłany do kodu
działającego w przeglądarce.

## Plan rozwoju

1. Zastąpienie zdjęć demonstracyjnych fotografiami Martyny.
2. Dodanie prawdziwych ebooków, przewodników, cen i opinii.
3. Uruchomienie sprzedaży oraz podstron produktów.
4. Formularze konsultacji, indywidualnego planowania i newslettera.
5. SEO, analityka i dokumenty prawne.
6. Podłączenie domeny `martynapodroze.pl`.
7. Rozwinięcie oferty o wspólne kobiece wyjazdy z Martyną.

## Indywidualne propozycje wyjazdów

Repo zawiera moduł Cloudflare Worker + D1 dla chronionego panelu
`/admin/wyjazdy`, publicznych ofert `/w/[slug]` i bezpiecznych przekierowań
`/go/[id]`. Instrukcja konfiguracji i wdrożenia znajduje się w
[`docs/wyjazdy-cloudflare.md`](docs/wyjazdy-cloudflare.md).
