// Wacht tot de volledige HTML-pagina is geladen voordat we JavaScript uitvoeren.
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SELECTEER HTML ELEMENTEN ---
    // We slaan de elementen die we vaak nodig hebben op in constanten.
    const calendarContainer = document.getElementById('calendar-container');
    const nameInput = document.getElementById('name');
    const calculateButton = document.getElementById('calculate-button');
    const resultsList = document.getElementById('results-list');

    // --- 2. DATASTRUCTUUR ---
    // Dit object zal alle data van alle gebruikers bijhouden.
    // Voorbeeld: { "Jan": { unavailable: ["2025-07-10"], available: ["2025-07-12"] } }
    let allUserData = {};

    // --- 3. KALENDER GENERATIE ---

    /**
     * Genereert de HTML voor een volledige maandkalender.
     * @param {number} year - Het jaar, bv. 2025
     * @param {number} month - De maand (0-gebaseerd, dus 0 = januari, 6 = juli)
     */
    function generateMonth(year, month) {
        const monthNames = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];
        const dayNames = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Bepaal de startdag van de week (0=Ma, 1=Di, ..., 6=Zo)
        const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

        // Start van de HTML voor de maand
        let monthHtml = `<div class="month">`;
        monthHtml += `<div class="month-header">${monthNames[month]} ${year}</div>`;
        monthHtml += `<div class="days-grid">`;

        // Voeg de namen van de dagen toe (Ma, Di, etc.)
        dayNames.forEach(name => {
            monthHtml += `<div class="day-name">${name}</div>`;
        });

        // Voeg lege vakjes toe voor de start van de maand
        for (let i = 0; i < startDayIndex; i++) {
            monthHtml += `<div class="day other-month"></div>`;
        }

        // Voeg alle dagen van de maand toe
        for (let day = 1; day <= daysInMonth; day++) {
            // Maak een unieke datum-string in YYYY-MM-DD formaat.
            // We voegen een '0' toe aan maand/dag als ze kleiner dan 10 zijn voor consistentie.
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            monthHtml += `<div class="day" data-date="${dateStr}">${day}</div>`;
        }
        
        monthHtml += `</div></div>`; // Sluit days-grid en month
        return monthHtml;
    }

    /**
     * De hoofdfunctie die de applicatie opstart en de kalenders rendert.
     */
    function renderApp() {
        // We willen juli en augustus 2025 tonen. Maanden zijn 0-gebaseerd (6=juli, 7=augustus)
        const year = 2025;
        const months = [6, 7]; 

        let calendarHtml = '';
        months.forEach(month => {
            calendarHtml += generateMonth(year, month);
        });
        calendarContainer.innerHTML = calendarHtml;
    }

    // --- 4. EVENT HANDLERS ---

    /**
     * Verwerkt een klik op een datum in de kalender.
     * @param {Event} event - Het klik-event object.
     */
    function handleDateClick(event) {
        const clickedElement = event.target;

        // Check 1: Is de gebruikersnaam ingevuld?
        const userName = nameInput.value.trim();
        if (!userName) {
            alert("Vul alsjeblieft eerst je naam in!");
            nameInput.focus();
            return;
        }

        // Check 2: Is er wel op een geldige dag geklikt?
        if (!clickedElement.classList.contains('day') || clickedElement.classList.contains('other-month')) {
            return; // Klik was niet op een dag, dus doe niets.
        }

        // Haal de data op van het element en de selectie
        const date = clickedElement.dataset.date;
        const selectionType = document.querySelector('input[name="selection-type"]:checked').value; // 'unavailable' of 'available'

        // Maak een plek voor de gebruiker in ons data-object als die nog niet bestaat
        if (!allUserData[userName]) {
            allUserData[userName] = { unavailable: [], available: [] };
        }

        const userData = allUserData[userName];
        
        // Verwijder de datum uit beide lijsten om te resetten, en update de kleur
        const wasUnavailable = userData.unavailable.indexOf(date);
        if (wasUnavailable > -1) userData.unavailable.splice(wasUnavailable, 1);
        
        const wasAvailable = userData.available.indexOf(date);
        if (wasAvailable > -1) userData.available.splice(wasAvailable, 1);

        clickedElement.classList.remove('unavailable', 'available');

        // Voeg de datum toe aan de JUISTE lijst, maar alleen als het nog niet die selectie was.
        if (selectionType === 'unavailable' && wasUnavailable === -1) {
            userData.unavailable.push(date);
            clickedElement.classList.add('unavailable');
        } else if (selectionType === 'available' && wasAvailable === -1) {
            userData.available.push(date);
            clickedElement.classList.add('available');
        }

        console.log("Huidige data:", allUserData); // Handig om te zien wat er gebeurt!
    }

    /**
     * Berekent en toont de beste data op basis van de ingevoerde gegevens.
     */
    function calculateBestDates() {
        // Stap 1: Verzamel alle unieke onbeschikbare dagen van iedereen.
        const allUnavailable = new Set();
        for (const user in allUserData) {
            allUserData[user].unavailable.forEach(date => allUnavailable.add(date));
        }

        // Stap 2: Maak een score voor elke beschikbare dag.
        const dateScores = {}; // bv. { "2025-07-20": 2, "2025-07-21": 1 }
        for (const user in allUserData) {
            allUserData[user].available.forEach(date => {
                // Tel alleen mee als de dag NIET onbeschikbaar is voor iemand anders.
                if (!allUnavailable.has(date)) {
                    dateScores[date] = (dateScores[date] || 0) + 1;
                }
            });
        }
        
        // Stap 3: Sorteer de data op basis van de score (hoogste eerst).
        const sortedDates = Object.entries(dateScores).sort((a, b) => b[1] - a[1]);
        
        // Stap 4: Toon de resultaten in de lijst.
        resultsList.innerHTML = ''; // Maak de lijst eerst leeg.
        if (sortedDates.length === 0) {
            resultsList.innerHTML = '<li>Geen geschikte overlappende data gevonden.</li>';
            return;
        }

        sortedDates.forEach(([date, score]) => {
            const li = document.createElement('li');
            li.textContent = `Datum: ${date} (Beschikbaar voor ${score} persoon/personen)`;
            resultsList.appendChild(li);
        });
    }


    // --- 5. EVENT LISTENERS ---
    // Koppel de functies aan de daadwerkelijke kliks.
    calendarContainer.addEventListener('click', handleDateClick);
    calculateButton.addEventListener('click', calculateBestDates);


    // --- START DE APPLICATIE ---
    renderApp();
});