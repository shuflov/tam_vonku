
document.addEventListener('DOMContentLoaded', async () => {
    const costDataSection = document.getElementById('cost-data');

    if (!costDataSection) {
        console.error("The section with ID 'cost-data' was not found.");
        return;
    }

    // Ensure _supabase is defined before attempting to use it
    if (!supabaseClient) {
        console.error("Supabase client is not initialized. Make sure 'supabaseClient' is defined globally before loading this script.");
        costDataSection.innerHTML += `<p>Error: Supabase client not available.</p>`;
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('cost_other')
            .select('description, cost, note, category, average, id')
        .order('id', { ascending: true });

        if (error) {
            console.error('Error fetching data:', error.message);
            costDataSection.innerHTML += `<p>Error loading cost data: ${error.message}</p>`;
            return;
        }

        if (!data || data.length === 0) {
            costDataSection.innerHTML += `<p>No other cost data found.</p>`;
            return;
        }

        // Group data by category
        const categorizedData = data.reduce((acc, item) => {
            if (!acc[item.category]) {
                acc[item.category] = [];
            }
            acc[item.category].push(item);
            return acc;
        }, {});

        // Clear existing content in the 'other-cost' div if necessary, or append
        const otherCostDiv = costDataSection.querySelector('.other-cost');
        if (otherCostDiv) {
            otherCostDiv.innerHTML = ''; // Clear placeholder
        } else {
            console.warn("Div with class 'other-cost' not found within 'cost-data' section. Appending tables directly to 'cost-data'.");
        }

        // Render tables for each category
        for (const category in categorizedData) {
            let tableHTML = '';
            let headerText = '';

            switch (category) {
                case 'visa':
                    headerText = 'Visa';
                    tableHTML = `
                        <h3>${headerText}</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Cost</th>
                                    <th>Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${categorizedData[category].map(item => `
                                    <tr>
                                        <td>${item.description || ''}</td>
                                        <td>${item.cost !== null ? item.cost : ''}</td>
                                        <td>${item.note || ''}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                    break;
                case 'travel insurance':
                    headerText = 'Travel Insurance Costs';
                    tableHTML = `
                        <h3>${headerText}</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Cost</th>
                                    <th>Note</th>
                                    <th>Average Per Day</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${categorizedData[category].map(item => `
                                    <tr>
                                        <td>${item.description || ''}</td>
                                        <td>${item.cost !== null ? item.cost : ''}</td>
                                        <td>${item.note || ''}</td>
                                        <td>${item.average || ''}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                    break;
                case 'other':
                    headerText = 'Other Costs';
                    tableHTML = `
                        <h3>${headerText}</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Cost</th>
                                    <th>Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${categorizedData[category].map(item => `
                                    <tr>
                                        <td>${item.description || ''}</td>
                                        <td>${item.cost !== null ? item.cost : ''}</td>
                                        <td>${item.note || ''}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                    break;
                default:
                    headerText = `${category.charAt(0).toUpperCase() + category.slice(1)} Costs`;
                    tableHTML = `
                        <h3>${headerText}</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Cost</th>
                                    <th>Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${categorizedData[category].map(item => `
                                    <tr>
                                        <td>${item.description || ''}</td>
                                        <td>${item.cost !== null ? item.cost : ''}</td>
                                        <td>${item.note || ''}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                    break;
            }
            if (otherCostDiv) {
                otherCostDiv.innerHTML += tableHTML + '<br>';
            } else {
                 costDataSection.innerHTML += tableHTML + '<br>';
            }
        }

    } catch (error) {
        console.error('An unexpected error occurred:', error);
        costDataSection.innerHTML += `<p>An unexpected error occurred while loading data.</p>`;
    }
});
