document.addEventListener("DOMContentLoaded", async function() {

    // Load accommodation data from CSV
    const accommodations = await loadCSV('data.csv');
    
    // Sort by id ascending
    accommodations.sort((a, b) => a.id - b.id);

    const tbody = document.querySelector("#accommodationTable tbody");
    tbody.innerHTML = ""; // Clear previous content
    accommodations.forEach(entry => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${entry.country}</td>
            <td>${entry.location}</td>
            <td>${entry["check in"]}</td>
            <td>${entry.nights}</td>
            <td>${entry["total price of stay"]}</td>
            <td>${entry.accommodation}</td>
        `;
        tbody.appendChild(row);
    });
});
