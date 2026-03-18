# Personalportal Smoke Test

Kort manuell checklista för att verifiera att personalportalens layout och grundnavigation fungerar efter deploy.

## När den ska användas

Kör detta pass när:

- `PortalLayout.astro` har ändrats
- navigation, profilblock eller mobilmeny har ändrats
- en deploy misstänks ha tappat CSS eller head-innehåll

## Förberedelser

1. Kör `npm run verify`.
2. Deploya den aktuella versionen.
3. Öppna sidan i ett nytt privat fönster eller gör en hård uppdatering.
4. Logga in i personalportalen.
5. Börja på `/personal/oversikt`.

## Desktop-check

Förväntat på vanlig desktopbredd:

- vänsterspalt är mörk och fixerad till vänster
- huvudinnehållet ligger till höger med luft runt korten
- mobilens toppbar visas inte
- mobilens drawer visas inte
- logotypen i vänsterspalten är liten och proportionerlig, inte jättestor
- användarblocket längst ned i sidbaren visar namn och roll
- `Logga ut` ligger i sidbaren, inte som lös länk i innehållet

## Mobil/check smal bredd

Minska fönstret eller använd mobilvy.

Förväntat:

- desktop-sidbaren försvinner
- mörk toppbar visas
- hamburgermenyn öppnar drawer från vänster
- overlay täcker resten av sidan
- drawer går att stänga med kryss eller klick på overlay

## Navigationscheck

Verifiera att följande sidor laddar utan att layouten faller sönder:

- `/personal/oversikt`
- `/personal/profil`
- `/personal/enkat`
- `/personal/admin`

## Typiska felsymtom

Om något av detta syns har portalens CSS eller head-injektion sannolikt gått sönder:

- enorm logotyp
- både desktop- och mobilnavigering samtidigt
- länkar listas som rå text utan paneler
- användarblock eller logout visas dubbelt
- stora vita ytor utan portalens normala kortlayout

## Snabb felsökningsnotering

`PortalLayout.astro` måste ha `<slot name="head" />` i `<head>`, annars kan Astro missa hoistade styles/scripts från portalsidorna.
