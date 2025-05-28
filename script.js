const startDate = new Date('2024-01-28'); // YYYY-MM-DD format is best for consistency
    const currentDate = new Date();
    const timeDiff = currentDate.getTime() - startDate.getTime();
    const daysOnRoad = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    document.getElementById('daysOnRoad').textContent = daysOnRoad + 1;

// Helper function (from previous response, for consistency)
const updateText = (id, value) => {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
};

// Display flight count (flight details moved to flightDetails.js)
async function getFlightCount() {
  const container = document.getElementById('numberOfFlights');
  if (!container) return;

  // Fetch count of flights
  const { count } = await supabaseClient
    .from('cost_transport')
    .select('*', { count: 'exact', head: true })
    .eq('type of transport', 'flight');

  updateText('numberOfFlights', count || '0');
}

async function getWorkawayCount() {
  const container = document.getElementById('workaway');
  if (!container) return;

  // Fetch all workaway entries to count unique locations
  const { data, error } = await supabaseClient
    .from('cost_accommodation')
    .select('location') // Only need the location column
    .eq('platform', 'workaway');

  if (error) {
    console.error('Error fetching workaway data for unique count:', error.message);
    updateText('workaway', 'N/A');
    return;
  }

  if (!data || data.length === 0) {
    updateText('workaway', '0');
    return;
  }

  // Get unique locations using a Set
  const uniqueLocations = new Set(data.map(entry => entry.location)).size;

  updateText('workaway', uniqueLocations || '0');
}

// Existing functions (unchanged from simplified version)
async function getUniqueAccommodationData() {
  const { data } = await supabaseClient
    .from('cost_accommodation')
    .select('accommodation, country');

  if (!data?.length) {
    updateText('uniquePlaces', '0');
    updateText('country', '0');
    return;
  }

  const uniquePlaces = new Set(data.map(item => item.accommodation)).size;
  const uniqueCountries = new Set(data.map(item => item.country)).size;

  updateText('uniquePlaces', uniquePlaces);
  updateText('country', uniqueCountries + 1);
}

async function calculateAveragePricePerNight() {
  const daysElem = document.getElementById('daysOnRoad');
  let days = null;
  for (let i = 0; i < 10; i++) {
    const parsed = parseInt(daysElem?.textContent);
    if (!isNaN(parsed)) {
      days = parsed;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  if (!days || days <= 0) {
    updateText('avgPricePerNight', 'N/A');
    return;
  }

  const { data } = await supabaseClient
    .from('cost_accommodation')
    .select('"total price of stay"');

  const totalSpent = data.reduce((sum, entry) => sum + (entry["total price of stay"] || 0), 0);
  updateText('avgPricePerNight', `€ ${(totalSpent / days / 2).toFixed(2)}`);
}

async function calculateAvgPerCountry() {
  const container = document.getElementById('avgPricePerNightCountryTable');
  if (!container) return;

  const { data } = await supabaseClient
    .from('cost_accommodation')
    .select('"total price of stay", country, nights');

  const countryAdjustments = {
    'sri lanka': 11,
    'south korea': 11,
    'slovakia': 1
  };

  const grouped = data.reduce((acc, { country = 'Unknown', ["total price of stay"]: price = 0, nights = 0 }) => {
    acc[country] = acc[country] || { totalPrice: 0, totalNights: 0 };
    acc[country].totalPrice += price;
    acc[country].totalNights += nights;
    return acc;
  }, {});

  for (const [country, nights] of Object.entries(countryAdjustments)) {
    if (grouped[country]) {
      grouped[country].totalNights = Math.max(0, grouped[country].totalNights - nights);
    }
  }

  const rows = Object.entries(grouped).map(([country, { totalPrice, totalNights }]) => `
    <tr>
      <td>${country}</td>
      <td>${totalNights}</td>
      <td>€ ${totalNights > 0 ? (totalPrice / totalNights / 2).toFixed(2) : 'N/A'}</td>
    </tr>
  `);

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Country</th>
          <th>Nights</th>
          <th>Avg Price per Person</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
}


// Initialize all functions
document.addEventListener('DOMContentLoaded', () => {
  getUniqueAccommodationData();
  calculateAveragePricePerNight();
  calculateAvgPerCountry();
  getFlightCount();
  getWorkawayCount(); 
});


const SUPABASE_URL = 'SUPABASE_URL_REMOVED';
const SUPABASE_KEY = 'SUPABASE_KEY_REDACTED';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggleFlightDetails');
    const flightDetailsContainer = document.getElementById('flightDetailsContainer');

    // Function to fetch and display flight details
    async function fetchAndDisplayFlightDetails() {
        // Ensure supabaseClient is accessible. If script.js loads after this,
        // you might need to re-initialize or ensure global scope.
        // For this example, we assume it's globally available.
        if (typeof supabaseClient === 'undefined') {
            console.error('Supabase client is not defined. Make sure script.js loads first.');
            return;
        }

        const { data, error } = await supabaseClient
            .from('cost_transport')
            .select('from, to, price')
            .eq('type of transport', 'flight');

        if (error) {
            console.error('Error fetching flight details:', error.message);
            flightDetailsContainer.innerHTML = '<p>Error loading flight details.</p>';
            return;
        }

        if (!data || data.length === 0) {
            flightDetailsContainer.innerHTML = '<p>No flight details found.</p>';
            return;
        }

        const rows = data.map(flight => `
            <tr>
                <td>${flight.from || 'Unknown'}</td>
                <td>${flight.to || 'Unknown'}</td>
                <td>€ ${(flight.price || 0).toFixed(2)}</td>
            </tr>
        `);

        flightDetailsContainer.innerHTML = `
            <div class="table-container">
                <table style="font-family: Arial, sans-serif;">
                    <thead>
                        <tr>
                            <th>From</th>
                            <th>To</th>
                            <th>Price per Person</th>
                        </tr>
                    </thead>
                    <tbody>${rows.join('')}</tbody>
                </table>
            </div>
        `;
    }

    // Event listener for the toggle button
    if (toggleButton && flightDetailsContainer) {
        toggleButton.addEventListener('click', () => {
            if (flightDetailsContainer.style.display === 'none') {
                // If currently hidden, show and fetch details
                flightDetailsContainer.style.display = 'block';
                toggleButton.textContent = 'Hide Details';
                // Only fetch details if the container is empty (first time showing)
                if (!flightDetailsContainer.innerHTML.trim()) {
                    fetchAndDisplayFlightDetails();
                }
            } else {
                // If currently visible, hide
                flightDetailsContainer.style.display = 'none';
                toggleButton.textContent = 'Show Details';
            }
        });
    } else {
        console.error('Toggle button or flight details container not found.');
    }
});



document.addEventListener('DOMContentLoaded', () => {
    const toggle2Button = document.getElementById('toggleWorkawayDetails');
    const workawayDetailsContainer = document.getElementById('workawayDetailsContainer');

    // Function to fetch and display flight details
    async function fetchAndDisplayWorkawayDetails() {

        if (typeof supabaseClient === 'undefined') {
            console.error('Supabase client is not defined. Make sure script.js loads first.');
            return;
        }

        const { data, error } = await supabaseClient
            .from('cost_accommodation')
            .select('country, nights, location')
            .eq('platform', 'workaway');

        if (error) {
            console.error('Error fetching flight details:', error.message);
            workawayDetailsContainer.innerHTML = '<p>Error loading workaway details.</p>';
            return;
        }

        if (!data || data.length === 0) {
            workawayDetailsContainer.innerHTML = '<p>No workaway details found.</p>';
            return;
        }

// Aggregate data by country and location
        const aggregatedProjects = data.reduce((acc, { country = 'Unknown', location = 'Unknown', nights = 0 }) => {
            const key = `${country}___${location}`; // Create a unique key for each country-location pair
            acc[key] = acc[key] || { country, location, totalNights: 0 }; // Initialize if not exists
            acc[key].totalNights += nights; // Sum the nights
            return acc;
        }, {});

        // Convert the aggregated object back to an array for mapping to table rows
        const rows = Object.values(aggregatedProjects).map(p => `
            <tr>
                <td>${p.country}</td>
                <td>${p.location}</td>
                <td>${p.totalNights}</td>
            </tr>
        `);

        workawayDetailsContainer.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>country</th>
                            <th>location</th>
                            <th>days</th>
                        </tr>
                    </thead>
                    <tbody>${rows.join('')}</tbody>
                </table>
            </div>
        `;
    }

    // Event listener for the toggle button
    if (toggle2Button && workawayDetailsContainer) {
        toggle2Button.addEventListener('click', () => {
            if (workawayDetailsContainer.style.display === 'none') {
                // If currently hidden, show and fetch details
                workawayDetailsContainer.style.display = 'block';
                toggle2Button.textContent = 'Hide Details';
                // Only fetch details if the container is empty (first time showing)
                if (!workawayDetailsContainer.innerHTML.trim()) {
                    fetchAndDisplayWorkawayDetails();
                }
            } else {
                // If currently visible, hide
                workawayDetailsContainer.style.display = 'none';
                toggle2Button.textContent = 'Show Details';
            }
        });
    } else {
        console.error('Toggle button or workaway details container not found.');
    }
//});

    // Event listener for the toggle button
    if (toggleAPN && avgPricePerNightCountryTable) {
        toggleAPN.addEventListener('click', () => {
            if (avgPricePerNightCountryTable.style.display === 'none') {
                // If currently hidden, show and fetch details
                avgPricePerNightCountryTable.style.display = 'block';
                toggleAPN.textContent = 'Hide Details';
                // Only fetch details if the container is empty (first time showing)
                if (!avgPricePerNightCountryTable.innerHTML.trim()) {
                    fetchAndDisplayAvgPricePerNightCountryTable();
                }
            } else {
                // If currently visible, hide
                avgPricePerNightCountryTable.style.display = 'none';
                toggleAPN.textContent = 'Show Details';
            }
        });
    } else {
        console.error('Toggle button or APN details container not found.');
    }
});
