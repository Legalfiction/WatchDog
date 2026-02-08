
# SafeGuard Watchdog - Setup Gids

## 1. Raspberry Pi Voorbereiden
Zorg dat Python en de Flask bibliotheken zijn geïnstalleerd:
```bash
pip install flask flask-cors requests
```

## 2. WhatsApp Inschakelen (Gratis)
De app gebruikt **CallMeBot** voor WhatsApp.
1. Voeg `+34 623 78 95 80` toe aan je contacten op WhatsApp.
2. Stuur het bericht: `I allow callmebot to send me messages`.
3. Je ontvangt direct je persoonlijke API Key. Vul deze in de app in bij je instellingen.

*Tip: In de app zit een directe knop die dit proces automatiseert!*

## 3. De Daily Check Automatiseren
De Pi checkt niet uit zichzelf; hij moet een seintje krijgen.
Gebruik een Cronjob die elke minuut checkt of er voor iemand een alarm afgegaan moet zijn.

Open je crontab:
```bash
crontab -e
```
Voeg deze regel toe:
`* * * * * curl -X POST http://localhost:5000/check_all`

## 4. Verbinding
Gebruik **Tailscale** voor de veiligste en makkelijkste verbinding tussen je telefoon en je Pi zonder poorten open te zetten.

## 5. Delen met vrienden
Gebruik de Deel-knop. Je vrienden krijgen een link waar jouw Pi-adres al is ingevuld. Ze hoeven alleen nog maar hun eigen activatie-appje te sturen via de ingebouwde knop.
