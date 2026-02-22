// Ping mechanisme - GEWIJZIGD VOOR ACHTERGRONDGEBRUIK
  useEffect(() => {
    if (status !== 'connected' || !activeUrl) return;
    const doPing = () => {
      // VERWIJDERD: document.visibilityState === 'visible'
      // Hierdoor blijft de app proberen te pingen in de achtergrond.
      if (!settingsRef.current.vacationMode) {
        fetch(`${activeUrl}/ping`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ name: settingsRef.current.name, secret: 'BARKR_SECURE_V1' }) 
        })
        .then(res => { if(res.ok) setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})); });
      }
    };
    doPing();
    const i = setInterval(doPing, 5000); 
    
    // We blijven luisteren naar activatie om direct te herstellen na een diepe slaap
    document.addEventListener('visibilitychange', doPing);
    return () => { clearInterval(i); document.removeEventListener('visibilitychange', doPing); };
  }, [status, activeUrl]);
