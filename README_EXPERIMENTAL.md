# Dugout Live Scores v0.4.10 Experimental / wersja testowa

**[Zainstaluj wersję eksperymentalną na Androidzie](https://raw.githubusercontent.com/zamorrr/do-live-scores/main/Dugout_Live_Scores_Experimental.user.js)**

> Ten plik nie zastępuje stabilnego `Dugout_Live_Scores.user.js`. Instalacja po opublikowaniu w repozytorium. Przed testami wyłącz stabilny skrypt w Tampermonkey, aby skrypty nie kolidowały.

## Test na Firefoxie Android

1. Prześlij do repozytorium **wyłącznie** `Dugout_Live_Scores_Experimental.user.js` i `README_EXPERIMENTAL.md` (nie zmieniaj stabilnych plików).
2. Na telefonie otwórz link instalacyjny powyżej; zaktualizuj wersję eksperymentalną do **0.4.10**.
3. Odśwież kartę otwartego meczu, sprawdź panel w **prawym dolnym rogu**.
4. Odczytaj tekst panelu: `gotowy`, `Firefox niewykryty` albo `brak Web Audio API`. Dla `gotowy` naciśnij przycisk i sprawdź, czy panel pokazuje `audio: running`.
5. Przejdź do rozgrywek. Wynik musi aktualizować **minutę** bez ręcznego powrotu do meczu. Samo zachowanie etykiety LIVE nie oznacza powodzenia testu.

Panel informacyjny pokazuje się w Androidzie niezależnie od rozpoznania Firefoxa, dzięki czemu nie znika bez wyjaśnienia, jeśli `AudioContext` albo wykrywanie przeglądarki jest problemem. Panel pojawia się tylko na stronie meczu, nie na stronie rozgrywek. Na innych systemach Web Audio nie jest uruchamiane.

Wykorzystywany oscylator ma `GainNode` ustawiony na 0 (brak słyszalnego dźwięku). Przeglądarka nadal może ograniczać timery i wstrzymywać karty — eksperyment nie daje gwarancji działania w tle. Skrypt nie wykonuje dodatkowych zapytań do serwera Dugout Online.

## English

**[Install experimental userscript](https://raw.githubusercontent.com/zamorrr/do-live-scores/main/Dugout_Live_Scores_Experimental.user.js)**

This is a separate experimental Tampermonkey script; it does **not** overwrite stable `Dugout_Live_Scores.user.js` or `README.md`. Disable the stable userscript during this experiment.

1. Upload only the two files in this package to the root of the `main` branch.
2. Install/update the experimental userscript from the link above (version **0.4.10**).
3. Reload a match tab on Firefox Android. Inspect the diagnostic panel in the lower-right corner: `gotowy` (ready), `Firefox niewykryty` (Firefox not detected), or `brak Web Audio API` (API unavailable).
4. When ready, tap the button. The panel should say `audio: running`. Switch to competitions and verify that the **match minute continues updating** while the match tab is in the background.

The zero-gain oscillator is inaudible. Firefox may nevertheless throttle or suspend the match tab. No extra match requests are made.
