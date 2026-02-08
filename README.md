
# SafeGuard Watchdog v5.2

Een welzijnsmonitor die draait op je Raspberry Pi en communiceert via WhatsApp.

## 1. Raspberry Pi Setup
```bash
pip install flask flask-cors requests --break-system-packages
python pi_backend.py
```

## 2. Cloudflare Tunnel (Permanent maken)
Een 'snelle' tunnel stopt zodra je de terminal sluit. Voor een permanente tunnel:
1. Maak een gratis Cloudflare account.
2. Ga naar 'Zero Trust' > 'Networks' > 'Tunnels'.
3. Maak een nieuwe tunnel en volg de instructies om de `connector` op je Pi te installeren.
4. Koppel een (sub)domein (bijv. `check.jouwdomein.nl`) aan `http://localhost:5000`.

*Geen domein? Gebruik de tijdelijke tunnel voor tests:*
`cloudflared tunnel --url http://localhost:5000`

## 3. WhatsApp Koppeling
Vrienden hoeven geen app te downloaden. Jij vult hun gegevens in.
Elke ontvanger moet éénmalig naar `+34 623 78 95 80` sturen:
`I allow callmebot to send me messages`

## 4. Automatisch Controleren (Cruciaal)
Zonder deze stap stuurt de Pi geen alarmen!
`crontab -e`
Voeg toe: `* * * * * curl -X POST http://localhost:5000/check_all`
