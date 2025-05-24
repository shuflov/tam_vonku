const SUPABASE_URL = 'SUPABASE_URL_REMOVED';
const SUPABASE_KEY = 'SUPABASE_KEY_REDACTED';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

// Display flight count and table
async function getFlightCount() {
  const container = document.getElementById('numberOfFlights');
  if (!container) return;

  // Fetch count of flights
  const { count } = await supabaseClient
    .from('cost_transport')
    .select('*', { count: 'exact', head: true })
    .eq('type of transport', 'flight');

  // Fetch flight details
  const { data } = await supabaseClient
    .from('cost_transport')
    .select('from, to, price')
    .eq('type of transport', 'flight');

  updateText('numberOfFlights', count || '0');

  if (!data?.length) {
    container.innerHTML += '<p>No flights found.</p>';
    return;
  }

  const rows = data.map(flight => `
    <tr>
      <td>${flight.from || 'Unknown'}</td>
      <td>${flight.to || 'Unknown'}</td>
      <td>€${(flight.price || 0).toFixed(2)}</td>
    </tr>
  `);

  container.innerHTML += `
    <table>
      <thead>
        <tr>
          <th>From</th>
          <th>To</th>
          <th>Price per Person</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
}

// Existing functions (unchanged from simplified version)
async function getUniqueAccommodationData() {
  const { data } = await supabaseClient
    .from('cost_accommodation')
    .select('accommodationName, country');

  if (!data?.length) {
    updateText('uniquePlaces', '0');
    updateText('country', '0');
    return;
  }

  const uniquePlaces = new Set(data.map(item => item.accommodationName)).size;
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
  updateText('avgPricePerNight', `€${(totalSpent / days / 2).toFixed(2)}`);
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
      <td>€${totalNights > 0 ? (totalPrice / totalNights / 2).toFixed(2) : 'N/A'}</td>
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

async function calculateWorkawayProjects() {
  const container = document.getElementById('workaway');
  if (!container) return;

  const { data } = await supabaseClient
    .from('cost_accommodation')
    .select('country, location, platform, nights');

  const projects = data
    .filter(entry => entry.platform?.toLowerCase() === 'workaway')
    .reduce((acc, { country = 'Unknown', location = 'Unknown', nights = 0 }) => {
      const key = `${country}___${location}`;
      acc[key] = acc[key] || { country, location, nights: 0 };
      acc[key].nights += nights;
      return acc;
    }, {});

  const rows = Object.values(projects).map(p => `
    <tr>
      <td>${p.country}</td>
      <td>${p.location}</td>
      <td>${p.nights}</td>
    </tr>
  `);

  container.innerHTML = `
    <p>${rows.length}</p>
    <table>
      <thead>
        <tr>
          <th>Country</th>
          <th>Location</th>
          <th>Days Spent</th>
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
  calculateWorkawayProjects();
  getFlightCount(); // Updated function
});
