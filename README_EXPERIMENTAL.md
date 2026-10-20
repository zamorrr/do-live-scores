# Dugout Online - Live Scores Experimental (v0.4.9)

**English below ↓**

Userscript do gry [Dugout Online](https://dugout-online.com/), który pokazuje **aktualne wyniki bezpośrednio na oryginalnych stronach rozgrywek ligowych i pucharowych**. Dane pochodzą wyłącznie z otwartych kart meczowych przeglądarki — skrypt nie wykonuje dodatkowych zapytań o wyniki.

> **Inny projekt:** [Dugout Live Center](https://github.com/zamorrr/do-live-center) wyświetla wyniki w **osobnej karcie**. Ten projekt, **Live Scores**, aktualizuje je **na stronie rozgrywek**. Można zainstalować oba, ale każdy działa niezależnie.

> **Oddzielny skrypt testowy:** nie nadpisuje stabilnego pliku `Dugout_Live_Scores.user.js` ani `README.md`. W Tampermonkey wyłącz stabilny Dugout Live Scores podczas testowania wersji eksperymentalnej, ponieważ oba skrypty obsługują te same strony i mogą modyfikować te same wyniki.

> **Wersja eksperymentalna v0.4.9:** Firefox na Androidzie — opcjonalny bezgłośny tryb Web Audio uruchamiany przyciskiem w karcie meczu. To test, nie gwarantowane obejście usypiania kart.

## Funkcje

- Aktualne wyniki spotkań na stronach ligi i pucharu.
- Automatyczna aktualizacja z już otwartych kart meczowych (około co 2 sekundy; raporty z kart około co 5 sekund).
- Dopasowanie meczu po unikalnym `gameId`, nie po nazwach drużyn.
- Minuta spotkania, gdy uda się odczytać zegar, oraz statusy `LIVE`, `HT`, `FT`.
- Rozpoznawanie oznaczeń dogrywki `a.e.t.` i rzutów karnych `pens X : Y` w dostępnych nagłówkach meczów.
- Po golu pulsuje **tylko zmieniona cyfra**; etykieta **⚽ GOOOL!** jest nakładką nad wynikiem (60 sekund).
- Zachowanie oryginalnych nazw klubów, herbów, ocen i linków do spotkań.
- Podgląd wyłącznie spotkań obecnych na aktualnie wyświetlanej stronie rozgrywek i raportowanych przez otwarte karty.

## Wymagania

- Przeglądarka z rozszerzeniem [Tampermonkey](https://www.tampermonkey.net/) (np. Firefox lub Chrome).
- Otwarta strona rozgrywek i co najmniej jedna otwarta karta meczu w [Dugout Online](https://dugout-online.com/).

## Instalacja

1. Zainstaluj i włącz [Tampermonkey](https://www.tampermonkey.net/).
2. Kliknij **[Zainstaluj Dugout Live Scores Experimental](https://raw.githubusercontent.com/zamorrr/do-live-scores/main/Dugout_Live_Scores_Experimental.user.js)**.
3. Potwierdź instalację skryptu w Tampermonkey.
4. Otwórz mecz lub kilka meczów w osobnych kartach, następnie odśwież te karty. **W Firefoxie na Androidzie dotknij w każdej karcie meczu przycisku „DLS: aktywuj tryb tła” przed przejściem na rozgrywki.**
5. Wejdź na stronę rozgrywek ligowych lub pucharowych (sekcja **Competition**) i obserwuj wyniki.

Jeśli instalacja z linku nie uruchamia Tampermonkey, otwórz plik [`Dugout_Live_Scores_Experimental.user.js`](Dugout_Live_Scores_Experimental.user.js), skopiuj cały kod i wklej go do nowego skryptu w Tampermonkey. **Link instalacyjny zacznie działać po umieszczeniu pliku w gałęzi `main` repozytorium.**

## Test Firefox Android (v0.4.9 Experimental)

Tylko w Firefoxie na Androidzie i tylko na stronie meczu widoczny jest przycisk aktywacji. Po dotknięciu uruchamia bezgłośny oscylator Web Audio (`GainNode` o głośności 0). Nie modyfikuje pozostałych przeglądarek i nie wysyła dodatkowych żądań do gry. Sprawdź, czy po przejściu do rozgrywek **minuta nadal rośnie**. W razie niepowodzenia wyłącz przycisk przez odświeżenie strony meczu. Firefox nadal może zawieszać kartę i `AudioContext`; nie jest to gwarantowane rozwiązanie.

## Jak to działa

Skrypt pracuje na dwóch rodzajach stron:

- `https://dugout-online.com/game/.../gameid/...` — odczytuje aktualnie wyświetlany wynik i stan meczu.
- `https://dugout-online.com/competitions/none...` — znajduje na stronie mecze po `gameId` i zastępuje widoczne wyniki danymi z otwartych kart.

Dane są przekazywane lokalnie przez funkcje Tampermonkey `GM_getTab`, `GM_saveTab` i `GM_getTabs`. Mecze nieotwarte w osobnych kartach pozostają bez zmian. W przypadku wygaśnięcia danych skrypt przywraca oryginalny wynik w widoku rozgrywek.

**Ważne:** to nie jest serwis wyników na żywo. Mecz musi być otwarty w karcie, a karta musi aktualizować swoją zawartość. Przy odtwarzaniu historycznego meczu na stronie rozgrywek może pojawić się stan odtwarzania, nie faktyczny wynik końcowy.

## Aktualizacje

Metadane `@version`, `@updateURL` i `@downloadURL` wskazują **wyłącznie na plik eksperymentalny** w tym repozytorium. Tampermonkey może wykrywać nowsze wersje automatycznie lub po wybraniu **Check for userscript updates**. Przy kolejnych publikacjach należy zwiększać `@version`.

## Prywatność i ograniczenia

- Skrypt **nie pobiera dodatkowo meczów** ani nie skanuje innych stron.
- Nie wymaga podawania loginu, hasła ani tokenów.
- Nie przesyła danych do zewnętrznego systemu analitycznego.
- Może nie odczytać niektórych nietypowych formatów meczów lub minuty meczu; w takim przypadku nie zgaduje brakującej minuty.
- Przeglądarka może wstrzymać wykonywanie JavaScript w kartach w tle; nie gwarantujemy aktualizacji co do sekundy.
- Rozszerzenie działa w obrębie stron Dugout Online; normalne zapytania wykonywane przez samą grę są odrębne od działania skryptu.

## Rozwiązywanie problemów

Jeżeli wynik się nie aktualizuje, odśwież wszystkie karty meczowe i stronę rozgrywek, sprawdź czy skrypt jest włączony oraz czy mecz ma link `gameid` w aktualnie widocznej rundzie. Nie włączaj równocześnie kilku wersji **Dugout Live Scores**. Gdy widzisz błędy, sprawdź konsolę przeglądarki (`F12`) i komunikaty `[Dugout Live Scores]`.

Projekt fanowski; nie jest oficjalną funkcją Dugout Online.

---

# English

> **Separate test script:** This package does not overwrite the stable `Dugout_Live_Scores.user.js` or `README.md`. Disable the stable Dugout Live Scores userscript in Tampermonkey while testing this experimental version: both scripts operate on the same pages and may compete to update scores.

> **Experimental v0.4.9:** Firefox for Android only. On each match tab, tap **“DLS: aktywuj tryb tła”** before switching to competitions. This starts a zero-gain, inaudible Web Audio oscillator. It may help timers run in background tabs but cannot prevent all Android tab suspension. Other browsers remain unchanged.

**Dugout Online - Live Scores** is a [Tampermonkey](https://www.tampermonkey.net/) userscript that displays **updating match scores directly on the original league and cup competition pages** of [Dugout Online](https://dugout-online.com/). It reads match states only from **already-open browser match tabs** and does not make extra score requests.

> **Separate project:** [Dugout Live Center](https://github.com/zamorrr/do-live-center) displays results in a **separate browser tab**. **Live Scores** updates the **original competition page** instead. Both scripts are independent.

## Features

- Updating scores on league and cup competition pages.
- Match matching by unique `gameId`, not by team name.
- Match minute where available and `LIVE`, `HT`, and `FT` indicators.
- Extra-time (`a.e.t.`) and penalty-shootout (`pens X : Y`) labels when detected in the open match view.
- A goal makes **only the changed score digit pulse**. A small **⚽ GOOOL!** overlay appears above the score for 60 seconds.
- Original team names, badges, match links and rating stars remain in place.
- Matches without a reporting tab are left unchanged.

## Requirements

- [Tampermonkey](https://www.tampermonkey.net/) in a compatible browser, such as Firefox or Chrome.
- At least one open Dugout Online match tab and an open competition page.

## Installation

1. Install and enable [Tampermonkey](https://www.tampermonkey.net/).
2. Click **[Install Dugout Live Scores Experimental](https://raw.githubusercontent.com/zamorrr/do-live-scores/main/Dugout_Live_Scores_Experimental.user.js)**.
3. Confirm the installation in Tampermonkey.
4. Open the matches you want to follow in separate tabs and refresh them after installation. **On Firefox Android, tap “DLS: aktywuj tryb tła” in each match tab first.**
5. Visit a league or cup competition page and watch the results update.

If direct installation does not work, open [`Dugout_Live_Scores_Experimental.user.js`](Dugout_Live_Scores_Experimental.user.js) and paste its entire contents into a new Tampermonkey script. **The installation link becomes active once the experimental userscript is uploaded to the repository’s `main` branch.**

## How it works

The script runs on game URLs containing `/game/...gameid/...` to read the displayed match state, and on `/competitions/none...` pages to locate matching fixtures. Tampermonkey's `GM_getTab`, `GM_saveTab`, and `GM_getTabs` exchange this information between tabs locally. It makes **no extra requests to fetch scores**.

On Firefox Android the optional experiment is enabled by a user tap on each match page. It uses Web Audio with zero gain (no audible output). Verify that the displayed match minute continues increasing after switching tabs. This experiment is not guaranteed to prevent tab suspension.

The view refreshes approximately every two seconds, while game tabs publish snapshots approximately every five seconds. Browser throttling can delay updates. If an open match stops reporting, its competition entry returns to the original site's value. Replaying a match can show its replayed state rather than its final result.

## Updates

The userscript includes `@version`, `@updateURL`, and `@downloadURL` pointing to this GitHub repository. Tampermonkey can check for updates automatically or via **Check for userscript updates**. Increase the version number when publishing new releases.

## Privacy and troubleshooting

The script doesn't ask for passwords or tokens, doesn't send data to external analytics, and doesn't independently fetch additional match results. It only reads the already displayed game and competition pages. If scores do not update, refresh the match tabs and competition page, confirm Tampermonkey is enabled, and disable duplicate copies of **Dugout Live Scores**. Check browser console messages containing `[Dugout Live Scores]` for errors.

Unofficial fan-made project; not affiliated with Dugout Online.
