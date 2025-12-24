
const startDate = new Date('2024-01-28');
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
  updateText('avgPricePerNight', `€ ${(totalSpent / (days-1) / 2).toFixed(2)}`);
}

async function calculateAvgPerCountry() {
  const container = document.getElementById('avgPricePerNightCountryTable');
  if (!container) return;

  const { data } = await supabaseClient
    .from('cost_accommodation')
    .select('"total price of stay", country, nights, id')
    .order('id', { ascending: true });

  // Night reductions for total nights
  const countryAdjustments = {
    'sri lanka': 11,
    'south korea': 11,
    'new zealand': 2,
    'slovakia': 1
  };

  // Night reductions for nights paid
  const paidNightsAdjustments = {
    'sri lanka': 11,
    'slovakia': 1
  };

  // Manual reductions on Avg Paid Price (in euros)
  const manualAvgPaidPriceReductions = {
    'sri lanka': 0,
    'new zealand': -2.99,
    'south korea': -2.87
  };

  // Group data by lowercase country key, store original name in displayName
  const grouped = data.reduce((acc, { country = 'Unknown', ["total price of stay"]: price = 0, nights = 0 }) => {
    const countryKey = country.toLowerCase();
    acc[countryKey] = acc[countryKey] || { totalPrice: 0, totalNights: 0, nightsPaid: 0, totalPaid: 0, displayName: country };
    acc[countryKey].totalPrice += price;
    acc[countryKey].totalNights += nights;

    if (price > 0) {
      acc[countryKey].nightsPaid += nights;
      acc[countryKey].totalPaid += price;
    }

    return acc;
  }, {});

  // Apply night reductions to totalNights
  for (const [countryKey, nightsToReduce] of Object.entries(countryAdjustments)) {
    if (grouped[countryKey]) {
      grouped[countryKey].totalNights = Math.max(0, grouped[countryKey].totalNights - nightsToReduce);
    }
  }

  // Apply night reductions to nightsPaid
  for (const [countryKey, nightsToReduce] of Object.entries(paidNightsAdjustments)) {
    if (grouped[countryKey]) {
      grouped[countryKey].nightsPaid = Math.max(0, grouped[countryKey].nightsPaid - nightsToReduce);
    }
  }

  // Generate table rows with all columns and manual avg paid price reduction
  const rows = Object.entries(grouped).map(([countryKey, { displayName, totalPrice, totalNights, nightsPaid, totalPaid }]) => {
    const avgPricePerPerson = totalNights > 0 ? (totalPrice / totalNights / 2) : null;
    let avgPaidPrice = nightsPaid > 0 ? (totalPaid / nightsPaid / 2) : null;

    // Apply manual reduction if applicable
    if (avgPaidPrice !== null && manualAvgPaidPriceReductions[countryKey]) {
      avgPaidPrice = Math.max(0, avgPaidPrice - manualAvgPaidPriceReductions[countryKey]);
    }

    return `
      <tr>
        <td>${displayName}</td>
        <td>${totalNights}</td>
        <td>${avgPricePerPerson !== null ? avgPricePerPerson.toFixed(2) : 'N/A'}</td>
        <td>${nightsPaid}</td>
        <td>${avgPaidPrice !== null ? avgPaidPrice.toFixed(2) : '0'}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Country</th>
          <th>Nights<br>(all)</th>
          <th>Avg Price<br>(all)</th>
          <th>Nights<br>(paid only)</th>
          <th>Avg Price<br>(paid only)</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
}



// Function to fetch and display flight details
async function fetchAndDisplayFlightDetails() {
  const flightDetailsContainer = document.getElementById('flightDetailsContainer');
  if (!flightDetailsContainer) return;

  if (typeof supabaseClient === 'undefined') {
    console.error('Supabase client is not defined. Make sure script.js loads first.');
    return;
  }

  const { data, error } = await supabaseClient
    .from('cost_transport')
    .select('from, to, price, id')
    .eq('type of transport', 'flight')
    .order('id', { ascending: false });

  if (error) {
    console.error('Error fetching flight details:', error.message);
    flightDetailsContainer.innerHTML = '<p>Error loading flight details.</p>';
    return;
  }

  if (!data || data.length === 0) {
    flightDetailsContainer.innerHTML = '<p>No flight details found.</p>';
    return;
  }

  // Calculate total price per person
  const totalPrice = data.reduce((sum, flight) => sum + (flight.price || 0), 0);

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
        <tbody>
          ${rows.join('')}
        </tbody>
<tfoot>
  <tr style="font-weight: bold; background-color: darkblue; color: #white;">
    <td colspan="2">Total Price per Person</td>
    <td>€ ${totalPrice.toFixed(2)}</td>
  </tr>
</tfoot>
      </table>
    </div>
    
<button class="detail-button" a href="visual.html" target="_blank">Flights on World map</button>
    
  `;
}

// Function to fetch and display workaway details
async function fetchAndDisplayWorkawayDetails() {
  const workawayDetailsContainer = document.getElementById('workawayDetailsContainer');
  if (!workawayDetailsContainer) return;

  if (typeof supabaseClient === 'undefined') {
    console.error('Supabase client is not defined. Make sure script.js loads first.');
    return;
  }

  const { data, error } = await supabaseClient
    .from('cost_accommodation')
    .select('country, nights, location, id')
    .eq('platform', 'workaway')
    .order('id', { ascending: false });

  if (error) {
    console.error('Error fetching workaway details:', error.message);
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

  // Calculate total days across all projects
  const totalDays = Object.values(aggregatedProjects).reduce((sum, project) => sum + project.totalNights, 0);

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
            <th>Country</th>
            <th>Location</th>
            <th>Days</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
        <tfoot>
          <tr style="font-weight: bold; background-color: darkblue; color: white;">
            <td colspan="2">Total Days</td>
            <td>${totalDays}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}


async function fetchAndDisplayAvgPricePerNightCountryTable() {
    await calculateAvgPerCountry();
}

async function fetchAndDisplayVisitedCountriesListContainer() {
    const container = document.getElementById('visitedCountriesListContainer');

    if (!container) {
        console.error('Visited Countries List Container not found.');
        return;
    }

    // 1. Select 'id' and 'country' and order by 'id'
    const { data, error } = await supabaseClient
        .from('cost_accommodation')
        .select('id, country') // Select both id and country
        .order('id', { ascending: true }); // Order by id in ascending order

    if (error) {
        console.error('Error fetching visited countries data:', error.message);
        container.innerHTML = '<p>Error loading visited countries.</p>';
        return;
    }

    let countriesToList = [];
    if (data && data.length > 0) {
        // Get unique countries from fetched data, maintaining order if possible
        // (Set preserves insertion order from ES2015 onwards)
        const uniqueFetchedCountries = new Set(data.map(item => item.country));
        countriesToList = [...uniqueFetchedCountries]; // Convert Set back to array
    }

    let combinedCountries = data ? data.map(item => ({ id: item.id, country: item.country })) : [];

    // Check if 'Norway' is already in the fetched data to avoid duplicates
    const isNorwayFetched = combinedCountries.some(item => item.country === 'Norway');

    if (!isNorwayFetched) {

        combinedCountries.push({ id: 50, country: 'Norway' });
    }

    combinedCountries.sort((a, b) => {
        if (a.id === b.id) {
            return a.country.localeCompare(b.country);
        }
        return a.id - b.id;
    });

    const uniqueSortedCountryNames = [...new Set(combinedCountries.map(item => item.country))];
    const listItems = uniqueSortedCountryNames.map(country => `<li>${country}</li>`).join('');
    container.innerHTML = `<ol>${listItems}</ol>`;
}


// Initialize all functions and event listeners within a single DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  getUniqueAccommodationData();
  calculateAveragePricePerNight();
  calculateAvgPerCountry();
  getFlightCount();
  getWorkawayCount();

  const toggleButton = document.getElementById('toggleFlightDetails');
  const flightDetailsContainer = document.getElementById('flightDetailsContainer');
  const toggle2Button = document.getElementById('toggleWorkawayDetails');
  const workawayDetailsContainer = document.getElementById('workawayDetailsContainer');
  const toggleAPN = document.getElementById('toggleAPN'); // Assuming you have an ID for this toggle button
  const avgPricePerNightCountryTable = document.getElementById('avgPricePerNightCountryTable');
  const toggleVisitedCountriesDetails = document.getElementById('toggleVisitedCountriesDetails'); // Assuming you have an ID for this toggle button
  const visitedCountriesListContainer = document.getElementById('visitedCountriesListContainer'); // Assuming you have an ID for this container
  const toggleAccommodationDetails = document.getElementById('toggleAccommodationDetails');

  // Event listener for the flight details toggle button
  if (toggleButton && flightDetailsContainer) {
    toggleButton.addEventListener('click', () => {
      if (flightDetailsContainer.style.display === 'none') {
        flightDetailsContainer.style.display = 'block';
        toggleButton.textContent = 'Hide Details';
        if (!flightDetailsContainer.innerHTML.trim()) {
          fetchAndDisplayFlightDetails();
        }
      } else {
        flightDetailsContainer.style.display = 'none';
        toggleButton.textContent = 'Show Details';
      }
    });
  } else {
    console.error('Toggle button or flight details container not found.');
  }

  // Event listener for the workaway details toggle button
  if (toggle2Button && workawayDetailsContainer) {
    toggle2Button.addEventListener('click', () => {
      if (workawayDetailsContainer.style.display === 'none') {
        workawayDetailsContainer.style.display = 'block';
        toggle2Button.textContent = 'Hide Details';
        if (!workawayDetailsContainer.innerHTML.trim()) {
          fetchAndDisplayWorkawayDetails();
        }
      } else {
        workawayDetailsContainer.style.display = 'none';
        toggle2Button.textContent = 'Show Details';
      }
    });
  } else {
    console.error('Toggle button or workaway details container not found.');
  }

  // Event listener for the Avg Price Per Night Country Table toggle button
  if (toggleAPN && avgPricePerNightCountryTable) {
    toggleAPN.addEventListener('click', () => {
      if (avgPricePerNightCountryTable.style.display === 'none') {
        avgPricePerNightCountryTable.style.display = 'block';
        toggleAPN.textContent = 'Hide Details';
        if (!avgPricePerNightCountryTable.innerHTML.trim()) {
          fetchAndDisplayAvgPricePerNightCountryTable();
        }
      } else {
        avgPricePerNightCountryTable.style.display = 'none';
        toggleAPN.textContent = 'Show Details';
      }
    });
  } else {
    console.error('Toggle button or APN details container not found.');
  }

  // Event listener for the Visited Countries List toggle button
  if (toggleVisitedCountriesDetails && visitedCountriesListContainer) {
    toggleVisitedCountriesDetails.addEventListener('click', () => {
      if (visitedCountriesListContainer.style.display === 'none') {
        visitedCountriesListContainer.style.display = 'block';
        toggleVisitedCountriesDetails.textContent = 'Hide List Of Visited Countries';
        if (!visitedCountriesListContainer.innerHTML.trim()) {
          fetchAndDisplayVisitedCountriesListContainer();
        }
      } else {
        visitedCountriesListContainer.style.display = 'none';
        toggleVisitedCountriesDetails.textContent = 'Show List Of Visited Countries';
      }
    });
  } else {
    console.error('Toggle button or visited countries list container not found.');
  }

  if (toggleAccommodationDetails && accommodationTable) {
    toggleAccommodationDetails.addEventListener('click', () => {
      if (accommodationTable.style.display === 'none') {
        accommodationTable.style.display = 'block';
        toggleAccommodationDetails.textContent = 'Hide Details';
        if (!document.querySelector('#accommodationTable tbody').innerHTML.trim()) {
          fetchAndDisplayAccommodationDetails();
        }
      } else {
        accommodationTable.style.display = 'none';
        toggleAccommodationDetails.textContent = 'Show Details';
      }
    });
  } else {
    console.error('Accommodation toggle button or table not found.');
  }
});
