# Dugout Live Scores — Experimental v0.4.11

[🇵🇱 Polski](#polski) · [🇬🇧 English](#english)

## Polski

**Testowa wersja dla Firefox na Androidzie.** Nie zastępuje stabilnego `Dugout_Live_Scores.user.js`.

### Instalacja

[**Zainstaluj wersję eksperymentalną v0.4.11**](https://raw.githubusercontent.com/zamorrr/do-live-scores/main/Dugout_Live_Scores_Experimental.user.js)

Najpierw prześlij do gałęzi `main` tylko dwa pliki z tej paczki: `Dugout_Live_Scores_Experimental.user.js` i `README_EXPERIMENTAL.md`. Stabilne pliki w repozytorium pozostają bez zmian. Na czas testu wyłącz stabilny skrypt w Tampermonkey, ponieważ obie wersje modyfikują te same wyniki.

### Test

1. W Firefoxie na Androidzie otwórz stronę meczu, np. `/game/none/gameid/15377028/replay/1/rmin/0`.
2. Poszukaj panelu **DLS EXP 0.4.11** w prawym dolnym rogu.
3. Jeśli jest dostępny, dotknij **DLS: aktywuj tryb tła**. Stan powinien zmienić się na `audio: running`.
4. Otwórz stronę rozgrywek, pozostawiając kartę meczu w tle. Sprawdź, czy minuta stale się zmienia.
5. Jeśli panel nadal się nie pokazuje, zgłoś to: przyczyny mogą dotyczyć wykonywania userscriptów lub zachowania przeglądarki, nie samego Web Audio.

### Co zmieniono

- Panel diagnostyczny jest dodawany poza `document.body`, w osobnym Shadow DOM.
- Panel jest automatycznie ponownie wstawiany, gdy strona usunie jego element.
- Obserwacja zmian meczu jest przypięta do `document.documentElement`.
- Web Audio działa tylko w Firefoxie na Androidzie; używa oscylatora z poziomem głośności zero.
- Brak dodatkowych żądań do serwerów gry.

**Uwaga:** to eksperyment. Nieme audio nie gwarantuje działania timerów w tle i może mieć wpływ na baterię. Inne przeglądarki pozostają bez zmian.

## English

**Experimental Firefox for Android release.** It does not replace the stable `Dugout_Live_Scores.user.js`.

### Install

[**Install experimental v0.4.11**](https://raw.githubusercontent.com/zamorrr/do-live-scores/main/Dugout_Live_Scores_Experimental.user.js)

Upload only `Dugout_Live_Scores_Experimental.user.js` and `README_EXPERIMENTAL.md` to `main`. Disable the stable userscript while testing to prevent two scripts from modifying the same results.

### Test

1. Open a match page in Firefox for Android.
2. Find the **DLS EXP 0.4.11** status panel in the lower-right corner.
3. Tap **DLS: aktywuj tryb tła** and look for `audio: running`.
4. Switch to the competition tab and check whether the match minute keeps updating without reactivating the match tab.

The diagnostic panel is attached outside the page body, uses Shadow DOM, and is recreated if the page removes it. The silent audio experiment runs only on Firefox for Android. Results may vary; browser background suspension is not guaranteed to be bypassed.
