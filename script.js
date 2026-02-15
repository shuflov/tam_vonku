
const startDate = new Date('2024-01-28');
const currentDate = new Date();
const timeDiff = 699;
const daysOnRoad = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
document.getElementById('daysOnRoad').textContent = 699;

// Helper function (from previous response, for consistency)
const updateText = (id, value) => {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
};

// CSV Loading Utility
async function loadCSV(filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load ${filePath}: ${response.status} ${response.statusText}`);
    }
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Error loading CSV:', error);
    return [];
  }
}

function parseCSV(csvText) {
  // Parse CSV handling quoted fields with commas and newlines
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (currentField !== '' || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      }
      // Skip \r\n sequence
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      currentField += char;
    }
  }
  
  // Don't forget the last row
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field !== '')) {
      rows.push(currentRow);
    }
  }
  
  if (rows.length < 2) return [];
  
  const headers = rows[0];
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    const row = {};
    headers.forEach((header, index) => {
      let value = values[index] !== undefined ? values[index] : '';
      // Convert numeric fields
      if (header === 'id' || header === 'price' || header === 'nights' || header === 'person' || header === 'total price of stay') {
        value = value ? parseFloat(value) : (header === 'person' ? 2 : 0);
      }
      row[header] = value;
    });
    data.push(row);
  }
  
  return data;
}

// Display flight count (flight details moved to flightDetails.js)
async function getFlightCount() {
  const container = document.getElementById('numberOfFlights');
  if (!container) return;

  // Load flights from CSV
  const flights = await loadCSV('flights.csv');
  const flightCount = flights.filter(f => f['type of transport'] === 'flight').length;

  updateText('numberOfFlights', flightCount || '0');
}

async function getWorkawayCount() {
  const container = document.getElementById('workaway');
  if (!container) return;

  // Load workaway data from CSV
  const data = await loadCSV('data.csv');
  const workawayData = data.filter(entry => entry.platform === 'workaway');

  if (!workawayData || workawayData.length === 0) {
    updateText('workaway', '0');
    return;
  }

  // Get unique locations using a Set
  const uniqueLocations = new Set(workawayData.map(entry => entry.location)).size;

  updateText('workaway', uniqueLocations || '0');
}

// Existing functions (unchanged from simplified version)
async function getUniqueAccommodationData() {
  // Load accommodation data from CSV
  const data = await loadCSV('data.csv');

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

  // Load data from CSV instead of Supabase
  const data = await loadCSV('data.csv');

  // Calculate total person-nights: sum of (nights / 2 * person)
  const totalPersonNights = data.reduce((sum, entry) => {
    const nights = entry.nights || 0;
    const person = entry.person || 2;
    return sum + ((nights / 2) * person);
  }, 0);
  
  const totalSpent = data.reduce((sum, entry) => sum + (entry["total price of stay"] || 0), 0);
  updateText('avgPricePerNight', `€ ${(totalSpent / totalPersonNights).toFixed(2)}`);
}

async function calculateAvgPerCountry() {
  const container = document.getElementById('avgPricePerNightCountryTable');
  if (!container) return;

  // Load data from CSV instead of Supabase
  const data = await loadCSV('data.csv');
  
  // Sort by id ascending
  data.sort((a, b) => (a.id || 0) - (b.id || 0));

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
  const grouped = data.reduce((acc, { country = 'Unknown', ["total price of stay"]: price = 0, nights = 0, person = 2 }) => {
    const countryKey = country.toLowerCase();
    acc[countryKey] = acc[countryKey] || { totalPrice: 0, totalNights: 0, nightsPaid: 0, totalPaid: 0, personNights: 0, personNightsPaid: 0, displayName: country };
    acc[countryKey].totalPrice += price;
    acc[countryKey].totalNights += nights;
    
    // Calculate person-nights: (nights / 2) * person
    const personNights = (nights / 2) * person;
    acc[countryKey].personNights += personNights;

    if (price > 0) {
      acc[countryKey].nightsPaid += nights;
      acc[countryKey].totalPaid += price;
      acc[countryKey].personNightsPaid += personNights;
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
  const rows = Object.entries(grouped).map(([countryKey, { displayName, totalPrice, totalNights, nightsPaid, totalPaid, personNights, personNightsPaid }]) => {
    const avgPricePerPerson = personNights > 0 ? (totalPrice / personNights) : null;
    let avgPaidPrice = personNightsPaid > 0 ? (totalPaid / personNightsPaid) : null;

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

  // Load flights from CSV
  const flights = await loadCSV('flights.csv');
  
  if (!flights || flights.length === 0) {
    flightDetailsContainer.innerHTML = '<p>No flight details found.</p>';
    return;
  }

  // Filter flights and sort by id descending
  const flightData = flights
    .filter(f => f['type of transport'] === 'flight')
    .sort((a, b) => b.id - a.id);

  // Calculate total price per person
  const totalPrice = flightData.reduce((sum, flight) => sum + (flight.price || 0), 0);

  const rows = flightData.map(flight => `
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
    
<button class="detail-button" onclick="window.open('visual.html', '_blank')">Flights on World map</button>
    
  `;
}

// Function to fetch and display workaway details
async function fetchAndDisplayWorkawayDetails() {
  const workawayDetailsContainer = document.getElementById('workawayDetailsContainer');
  if (!workawayDetailsContainer) return;

  // Load workaway data from CSV
  const data = await loadCSV('data.csv');
  const workawayData = data.filter(entry => entry.platform === 'workaway');

  if (!workawayData || workawayData.length === 0) {
    workawayDetailsContainer.innerHTML = '<p>No workaway details found.</p>';
    return;
  }

  // Aggregate data by country and location
  const aggregatedProjects = workawayData.reduce((acc, { country = 'Unknown', location = 'Unknown', nights = 0 }) => {
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

    // Load accommodation data from CSV
    const data = await loadCSV('data.csv');
    
    // DEBUG: Log what we got
    console.log('CSV data loaded:', data.length, 'rows');
    console.log('First row:', data[0]);
    console.log('Sample id values:', data.slice(0, 3).map(d => ({ id: d.id, country: d.country })));

    if (!data || data.length === 0) {
        container.innerHTML = '<p>No visited countries data found.</p>';
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
    
    // DEBUG: Log combined countries
    console.log('Combined countries before Norway:', combinedCountries.slice(0, 3));

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
    
    // DEBUG: Log after sort
    console.log('Combined countries after sort:', combinedCountries.slice(0, 5));

    const uniqueSortedCountryNames = [...new Set(combinedCountries.map(item => item.country))];
    
    // DEBUG: Log final list
    console.log('Final unique countries:', uniqueSortedCountryNames);
    
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
