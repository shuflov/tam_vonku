document.addEventListener("DOMContentLoaded", async function() {

    // Fetch data
    let { data: accommodations, error } = await supabase
        .from('accommodations')
        .select('*')
        .order('check_in', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    const tbody = document.querySelector("#accommodationTable tbody");
    tbody.innerHTML = ""; // Clear previous content
    accommodations.forEach(entry => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${entry.location}</td>
            <td>${entry.check_in}</td>
            <td>${entry.check_out}</td>
            <td>${entry.nights}</td>
            <td>${entry.total_price}</td>
            <td>${entry.name}</td>
        `;
        tbody.appendChild(row);
    });
});
